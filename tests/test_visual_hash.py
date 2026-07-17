import io
import json

from PIL import Image, ImageDraw

from security.visual_hash import analyze_visual_hash, dhash64, hash_similarity


def _image(invert: bool = False) -> bytes:
    image = Image.new("RGB", (160, 100), "black" if invert else "white")
    draw = ImageDraw.Draw(image)
    draw.rectangle((20, 20, 140, 80), fill="white" if invert else "black")
    output = io.BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


def test_visual_hash_matches_curated_brand_on_unofficial_domain(tmp_path):
    screenshot = _image()
    reference, _, _ = dhash64(screenshot)
    registry = tmp_path / "brands.json"
    registry.write_text(
        json.dumps(
            {
                "version": 1,
                "match_threshold": 0.88,
                "brands": [
                    {
                        "brand": "examplebank",
                        "allowed_domains": ["examplebank.test"],
                        "hashes": [reference],
                    }
                ],
            }
        ),
        encoding="utf-8",
    )

    result = analyze_visual_hash(
        screenshot,
        host="examplebank-login.evil.test",
        title="ExampleBank Sign in",
        registry_path=registry,
    )

    assert result["brand_mismatch"] is True
    assert result["matched_brand"] == "examplebank"
    assert result["raw_screenshot_stored"] is False
    assert hash_similarity(reference, reference) == 1.0
