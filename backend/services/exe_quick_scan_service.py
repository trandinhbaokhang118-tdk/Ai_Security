"""Application wiring for the quick executable analysis service."""

from backend.config import settings
from security.exe_quick_scan import ExeQuickScanService, MetaDefenderProvider

metadefender_provider = MetaDefenderProvider(
    settings.metadefender_api_key,
    base_url=settings.metadefender_base_url,
    timeout_seconds=settings.metadefender_timeout_seconds,
)
exe_quick_scan_service = ExeQuickScanService(provider=metadefender_provider)
