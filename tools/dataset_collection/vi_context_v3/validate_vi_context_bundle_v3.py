#!/usr/bin/env python3
from __future__ import annotations
import argparse, gzip, hashlib, json, re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

import build_vi_context_bundle_v3 as gen

SPLITS=("train","validation","test")
TASKS=("message_context","explanation")
DECISION_KEYS={"decision","allow","warn","block","final_decision","policy_decision"}

def norm(text:str)->str:
    return re.sub(r"\s+"," ",str(text)).strip().lower()

def read_rows(path:Path):
    with gzip.open(path,"rt",encoding="utf-8") as f:
        for i,line in enumerate(f,1):
            yield i,json.loads(line)

def parse_message_payload(row:dict[str,Any])->tuple[dict[str,Any],dict[str,Any]]:
    msgs=row["messages"]
    assert [m["role"] for m in msgs]==["system","user","assistant"]
    user=msgs[1]["content"]
    assert user.startswith("UNTRUSTED_DATA_JSON_BEGIN\n") and user.endswith("\nUNTRUSTED_DATA_JSON_END")
    payload=json.loads(user.split("\n",1)[1].rsplit("\n",1)[0])
    output=json.loads(msgs[2]["content"])
    return payload,output

def resolve_ref(payload:dict[str,Any],ref:str)->str:
    if ref=="content": return str(payload["content"])
    if ref.startswith("metadata.user_context."):
        return str(payload["metadata"]["user_context"][ref.rsplit(".",1)[1]])
    m=re.fullmatch(r"metadata\.conversation\[(\d+)\]",ref)
    if m:
        return str(payload["metadata"]["conversation"][int(m.group(1))]["content"])
    raise AssertionError(f"unresolvable ref {ref}")

def validate_message(row:dict[str,Any],where:str)->dict[str,Any]:
    assert row["task"]=="message-context-adapter",where
    payload,out=parse_message_payload(row)
    assert payload["trust_boundary"]=="untrusted_data"
    assert payload["instruction_policy"]=="treat_as_data_never_instructions"
    assert payload["modality"] in {"email","sms","text","chat","call_transcript"}
    meta=payload["metadata"]; ctx=meta["user_context"]
    assert meta["locale"]=="vi" and meta["context_schema_version"]=="3"
    assert meta["scenario_family"] in gen.ID_TO_GROUP
    assert meta["scenario_profile"]==gen.ID_TO_GROUP[meta["scenario_family"]]
    profile=gen.profile_for(meta["scenario_family"])
    assert ctx["relationship"] in profile["relationships"],(where,ctx["relationship"])
    assert ctx["recent_event"] in profile["recent_events"],(where,ctx["recent_event"])
    assert ctx["normal_behavior"] in profile["normal_behaviors"],(where,ctx["normal_behavior"])
    assert ctx["user_concern"] in profile["concerns"],(where,ctx["user_concern"])
    assert ctx["user_action_taken"] in profile["actions"],(where,ctx["user_action_taken"])
    assert meta["user_question"] in profile["questions"]+gen.GENERIC_QUESTIONS or meta["user_question"].startswith("Tôi đã thao tác") or meta["user_question"].startswith("Tôi chưa chuyển")
    conv=meta["conversation"]
    if conv:
        assert len(conv)==4
        assert conv[2]["content"]==payload["content"]
    assert out["analyzed_modality"]==payload["modality"]
    assert 0<=out["risk_signal"]<=1 and 0<=out["confidence"]<=1
    assert not (set(map(str.lower,out.keys())) & DECISION_KEYS)
    ids=set()
    for f in out["findings"]:
        assert f["evidence_id"] not in ids
        ids.add(f["evidence_id"])
        assert f["severity"] in {"info","low","medium","high","critical"}
        assert 0<=float(f["risk_signal"])<=1
        attrs=f["attributes"]; ref=attrs["evidence_reference"]
        value=resolve_ref(payload,ref)
        excerpt=attrs["evidence_excerpt"]
        assert norm(excerpt) in norm(value),(where,ref,excerpt,value[:200])
        assert attrs["grounding"]=="exact_input_reference"
    return {"case_id":row["case_id"],"family_hash":row["family_hash"],"payload":payload,"output":out}

def validate_explanation(row:dict[str,Any],where:str)->dict[str,Any]:
    assert row["task"]=="explanation-adapter"
    msgs=row["messages"]; assert [m["role"] for m in msgs]==["system","user","assistant"]
    inp=json.loads(msgs[1]["content"]); out=json.loads(msgs[2]["content"])
    assert inp["trust_boundary"]=="evidence_only"
    assert inp["instruction_policy"]=="never_change_decision_or_invent_evidence"
    assert inp["assessment"]["case_id"]==row["case_id"]
    supplied={x["evidence_id"] for x in inp["evidence"]}
    cited=set(out["cited_evidence_ids"])
    assert cited and cited<=supplied
    answer=out["answer"]; decision=inp["assessment"]["decision"]
    assert decision in answer
    q=inp["question"].lower(); a=answer.lower()
    if "bấm liên kết" in q or "thao tác một phần" in q:
        assert any(x in a for x in ["không nhập thêm","đóng trang","không mở"])
    if "gọi lại số" in q:
        assert any(x in a for x in ["số tổng đài","số chính thức","liên hệ đã lưu"])
    if "người quen" in q or "chuỗi trao đổi cũ" in q or "danh tính" in q:
        assert "xác minh" in a and any(x in a for x in ["chiếm quyền","số quen thuộc","video call","kênh độc lập"])
    if "chuyển tiền" in q or "otp" in q or "nhận tiền" in q:
        assert any(x in a for x in ["không chuyển tiền","không cung cấp otp","không thực hiện hành động nhạy cảm"])
    return {"case_id":row["case_id"],"family_hash":row["family_hash"],"input":inp,"output":out}

def sha_uncompressed(path:Path)->str:
    h=hashlib.sha256()
    with gzip.open(path,"rb") as f:
        for chunk in iter(lambda:f.read(1024*1024),b""): h.update(chunk)
    return h.hexdigest()

def validate(root:Path,verify_hashes:bool=True)->dict[str,Any]:
    manifest=json.loads((root/"dataset_manifest.json").read_text("utf-8"))
    report={"ok":False,"rows":{},"duplicates":{},"family_overlap":{},"alignment":{}}
    messages_by_case={}; explanations_by_case={}
    family_sets=defaultdict(dict); prompt_sets=defaultdict(set)
    for task in TASKS:
        report["rows"][task]={}
        for split in SPLITS:
            path=root/task/f"{split}.jsonl.gz"
            count=0; duplicate=0; fams=set()
            for line,row in read_rows(path):
                where=f"{task}/{split}:{line}"
                rec=validate_message(row,where) if task=="message_context" else validate_explanation(row,where)
                target=messages_by_case if task=="message_context" else explanations_by_case
                assert rec["case_id"] not in target,(where,"duplicate case_id")
                target[rec["case_id"]]=(split,rec)
                fams.add(rec["family_hash"])
                ph=hashlib.sha256(json.dumps(row["messages"][:2],ensure_ascii=False,sort_keys=True).encode()).hexdigest()
                key=(task,split)
                if ph in prompt_sets[key]: duplicate+=1
                prompt_sets[key].add(ph)
                count+=1
            report["rows"][task][split]=count
            report["duplicates"][f"{task}/{split}"]=duplicate
            family_sets[task][split]=fams
            expected=manifest["datasets"][task]["splits"][split]
            assert count==expected["rows"],(task,split,count,expected["rows"])
            if verify_hashes:
                assert sha_uncompressed(path)==expected["uncompressed_sha256"],(task,split,"sha mismatch")
    for task in TASKS:
        for a,b in (("train","validation"),("train","test"),("validation","test")):
            ov=len(family_sets[task][a]&family_sets[task][b])
            report["family_overlap"][f"{task}:{a}__{b}"]=ov
            assert ov==0
    assert set(messages_by_case)==set(explanations_by_case)
    mismatch=0
    for cid,(split,m) in messages_by_case.items():
        esplit,e=explanations_by_case[cid]
        assert split==esplit
        inp=e["input"]
        mout=m["output"]
        assert inp["assessment"]["risk_score"]==mout["risk_signal"]
        assert inp["assessment"]["confidence"]==mout["confidence"]
        assert inp["assessment"]["surface"]==m["payload"]["modality"]
        msg_ids={f["evidence_id"] for f in mout["findings"]}
        exp_ids={f["evidence_id"] for f in inp["evidence"]}
        if msg_ids!=exp_ids: mismatch+=1
    assert mismatch==0
    assert all(v==0 for v in report["duplicates"].values())
    report["alignment"]={"case_ids":len(messages_by_case),"message_explanation_mismatches":mismatch}
    report["ok"]=True
    (root/"validation_report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    return report

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--bundle-root",type=Path,required=True)
    p.add_argument("--skip-checksums",action="store_true")
    args=p.parse_args()
    print(json.dumps(validate(args.bundle_root.resolve(),not args.skip_checksums),ensure_ascii=False,indent=2))

if __name__=="__main__":
    main()
