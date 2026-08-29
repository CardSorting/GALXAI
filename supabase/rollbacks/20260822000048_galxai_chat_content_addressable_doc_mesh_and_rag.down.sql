-- ROLLBACK: Migration 48 (Content-Addressable Document Mesh and RAG)
DROP FUNCTION IF EXISTS public.fn_register_content_addressable_document(VARCHAR, VARCHAR, VARCHAR, JSONB);
DROP FUNCTION IF EXISTS public.fn_search_relevant_document_chunks(VARCHAR, TEXT, INT);
ALTER TABLE public.galx_chat_document_chunks 
    DROP COLUMN IF EXISTS doc_sha256,
    DROP COLUMN IF EXISTS search_vector;
