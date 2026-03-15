from .ia_services       import generate_plan_with_ai, _fallback_plan, _extract_json
from .supabase_service  import db_manager
from .embedding_service import embed_text, model_ready
from .prompt_builder    import (
    build_interpretive_prompt,
    build_analytical_prompt,
    build_exercise_prompt,
)
from .resource_catalog  import (
    get_resources_for_module,
    get_performance_test_resources,
    format_resources_for_prompt,
)

__all__ = [
    "generate_plan_with_ai",
    "_fallback_plan",
    "_extract_json",
    "db_manager",
    "embed_text",
    "model_ready",
    "build_interpretive_prompt",
    "build_analytical_prompt",
    "build_exercise_prompt",
    "get_resources_for_module",
    "get_performance_test_resources",
    "format_resources_for_prompt",
]