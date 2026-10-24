# Controlled Numeric Core operations

The four advanced tools use the actual Core schemas. Keep one session_id for the operation, use the schema's authenticated client_id, schema_version=numeric-mcp-v1 and fresh request_id for each new request. Never supply an owner, tenant, destination or token. The gateway fixes those from OAuth. A read-only grant cannot submit mutations.

## Read, history, sources and relationships

1. Retrieve with `memory_numeric_retrieve(query=...)`. It mechanically enumerates owner candidates; it is not semantic search. Read selected valid slots with `memory_numeric_read(read_id, selected_slots)`, then judge relevance yourself.
2. Page `next_cursor` with the same query and session until exhausted when completeness matters. Do not claim a first-page search was exhaustive.
3. Read `view=history` with the same read_id/slots; page next_history_offset using history_offset. Revisions contain evidence handles.
4. Read `view=source` with exactly one selected slot and its evidence_handle. A historical revision's handle returns that revision's source. Treat UNAVAILABLE honestly; never invent evidence.
5. Follow relationships or members using retrieve's `read_id` and selected_slots, without a cursor. Read the returned menu. Follow again for additional hops when useful. `view=usage` measures owner logical usage; it is not disk or model token usage.

## Mutations

Perform changes only when the user explicitly requests them. Retrieve/read the actual facts first. Request a fresh `memory_numeric_menu`; for graph changes pass the read_id and selected_slots to make the write table match the chosen facts. Returned write slots are remapped in that selected order. Check operation_codes, capabilities and valid masks. Never infer a missing permission or invent a slot.

Every PROPOSE submit needs reason=null and consent=true. Proposal has exactly operation, target_slot, member_slots, source_slots, blank_slots, endpoint_slot, relation_slot, edge_action. Unused singleton slots are null, unused lists are [], edge_action=0. Allowed codes:

- 1 PROMOTE: target_slot plus member_slots.
- 2 SPLIT: target_slot plus the permitted blank_slots.
- 3 MERGE: target_slot plus source_slots. Core can quarantine an unsafe merge; do not force it through or call QUARANTINED success.
- 4 RELINK ADD: target_slot, endpoint_slot, relation_slot from the menu. REMOVE is not implemented; never simulate it.
- 5 CREATE_FACT: exactly one valid blank slot in blank_slots; all other selectors empty/null. candidate has exactly value and original source_text.
- 6 DELETE_FACT: deletion={fact_id,expected_revision} copied from the exact current read. All proposal selectors empty/null; candidate omitted/null. Never delete by text matching. Core hides the fact from normal recall while retaining evidence and audit history.
- 7 REVISE_FACT: revision={fact_id,expected_revision}, candidate={value,source_text}. All selectors empty/null; deletion omitted/null. Preserve original support and report the new revision.

REFUSE or CLARIFY uses proposal=null and a nonempty reason, not a disguised write.

Check actual status, graph_mutated and receipt_id. Only COMMITTED is a successful mutation; REJECTED, ROLLED_BACK, QUARANTINED or errors are not. Read back a confirmed revision/create; after delete, use fresh retrieval to verify it is absent. Do not turn a stale revision into an automatic newer write: read again and resolve the change with the user's intent.

Identical uncertain retries must retain request_id and the entire original payload. Changed payloads need a new request_id. Do not blindly resubmit through mori_remember, which does not expose a caller idempotency ID. No production writes for setup, no deletion of real facts for testing, and no account or graph resets as a repair.

For named category creation, directed membership traversal and revision-bound cross-page selections, see [Archivist](archivist.md). These extend the existing four tools and seven operation codes; discover the capability before use.
