// C4 — directory cross-section and file preview.
import { USE_FIXTURES } from "./index";
import { FIXTURE_TREE, FIXTURE_FILE_PREVIEWS } from "./fixtures";
import type { TreeNode, FilePreview } from "./types";

/** Lazy one-level directory listing. Phase 0 returns the Idolmancer sample tree. */
export async function listDir(_path: string): Promise<TreeNode[]> {
  if (USE_FIXTURES) return FIXTURE_TREE;
  return FIXTURE_TREE;
}

export async function previewFile(name: string, _maxLines?: number): Promise<FilePreview | null> {
  if (USE_FIXTURES) return FIXTURE_FILE_PREVIEWS[name] ?? null;
  return FIXTURE_FILE_PREVIEWS[name] ?? null;
}
