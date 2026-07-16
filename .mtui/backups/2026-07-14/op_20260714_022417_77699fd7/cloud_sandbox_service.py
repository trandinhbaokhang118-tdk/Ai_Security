"""Provision and terminate disposable Windows EC2 sandbox instances."""
from __future__ import annotations

from urllib.parse import quote

from backend.config import settings


class CloudSandboxService:
    def _client(self):
        try:
            import boto3
        except ImportError as exc:
            raise RuntimeError("Chưa cài boto3 cho AWS sandbox") from exc
        return boto3.client("ec2", region_name=settings.aws_region)

    def configured(self) -> bool:
        return bool(
            settings.aws_sandbox_ami_id
            and settings.aws_sandbox_subnet_id
            and settings.aws_sandbox_security_group_id
        )

    def provision(self, session_id: str, user_id: str, expires_iso: str, tier: str = "pro") -> tuple[str, str]:
        if not self.configured():
            raise RuntimeError("AWS sandbox chưa được cấu hình đầy đủ")
        is_max = tier == "max"
        image_id = settings.aws_sandbox_max_ami_id if is_max else settings.aws_sandbox_ami_id
        if not image_id:
            raise RuntimeError(f"AMI cho Sandbox {tier.upper()} chưa được cấu hình")
        params = {
            "ImageId": image_id,
            "InstanceType": settings.aws_sandbox_max_instance_type if is_max else settings.aws_sandbox_instance_type,
            "MinCount": 1,
            "MaxCount": 1,
            "SubnetId": settings.aws_sandbox_subnet_id,
            "SecurityGroupIds": [settings.aws_sandbox_security_group_id],
            "InstanceInitiatedShutdownBehavior": "terminate",
            "MetadataOptions": {"HttpTokens": "required", "HttpEndpoint": "enabled", "HttpPutResponseHopLimit": 1},
            "BlockDeviceMappings": [{"DeviceName": "/dev/sda1", "Ebs": {"DeleteOnTermination": True, "Encrypted": True, "VolumeType": "gp3"}}],
            "TagSpecifications": [{"ResourceType": "instance", "Tags": [
                {"Key": "Name", "Value": f"prewise-sandbox-{session_id[:8]}"},
                {"Key": "PrewiseSession", "Value": session_id},
                {"Key": "PrewiseUser", "Value": user_id},
                {"Key": "ExpiresAt", "Value": expires_iso},
            ]}],
        }
        if settings.aws_sandbox_key_name:
            params["KeyName"] = settings.aws_sandbox_key_name
        ec2 = self._client()
        instance_id = ec2.run_instances(**params)["Instances"][0]["InstanceId"]
        waiter = ec2.get_waiter("instance_running")
        waiter.wait(InstanceIds=[instance_id], WaiterConfig={"Delay": 5, "MaxAttempts": 48})
        instance = ec2.describe_instances(InstanceIds=[instance_id])["Reservations"][0]["Instances"][0]
        host = instance.get("PublicDnsName") or instance.get("PublicIpAddress")
        if not host:
            self.terminate(instance_id)
            raise RuntimeError("EC2 sandbox không có địa chỉ public")
        token = quote(session_id, safe="")
        remote_url = f"https://{host}:{settings.aws_sandbox_remote_port}/?session={token}"
        return instance_id, remote_url

    def terminate(self, instance_id: str) -> None:
        if instance_id:
            self._client().terminate_instances(InstanceIds=[instance_id])


cloud_sandbox_service = CloudSandboxService()
