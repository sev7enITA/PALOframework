export const PALO_KNOWLEDGE_READER_TOOLS = Object.freeze([
  "palo_explain_framework",
  "palo_infer_governance_route",
  "palo_plan_product_integration",
  "palo_list_knowledge_sources",
  "palo_search_knowledge",
  "palo_get_knowledge_record"
]);

export const PALO_KNOWLEDGE_CURATOR_TOOLS = Object.freeze([
  ...PALO_KNOWLEDGE_READER_TOOLS,
  "palo_submit_knowledge_draft",
  "palo_list_knowledge_drafts",
  "palo_get_knowledge_draft",
  "palo_review_knowledge_draft"
]);
