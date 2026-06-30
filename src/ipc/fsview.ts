// C4 — directory cross-section and file preview (Phase 2). Backed by core.
import { invoke } from "@tauri-apps/api/core";
import { backendActive } from "./index";
import { FIXTURE_TREE, FIXTURE_FILE_PREVIEWS } from "./fixtures";
import type { TreeNode, FilePreview } from "./types";

/**
 * Lazy one-level directory listing. The real backend returns one level per call
 * (children unset). In fixtures we serve the sample tree: the project root returns
 * the full nested tree (rendered client-side), and a sub-path returns that node's
 * children by walking it.
 */
export async function listDir(path: string, rootPath?: string): Promise<TreeNode[]> {
  if (backendActive) return invoke<TreeNode[]>("list_dir", { path });
  if (!rootPath || path === rootPath) return FIXTURE_TREE;
  // resolve a sub-path relative to the fixture root
  const rel = path.slice(rootPath.length).split("/").filter(Boolean);
  let nodes: TreeNode[] | undefined = FIXTURE_TREE;
  for (const seg of rel) {
    const next: TreeNode | undefined = nodes?.find((n) => n.name === seg && n.type === "dir");
    nodes = next?.children;
  }
  return nodes ?? [];
}

export async function previewFile(path: string, maxLines?: number): Promise<FilePreview | null> {
  if (backendActive) return invoke<FilePreview | null>("preview_file", { path, maxLines: maxLines ?? null });
  const base = path.split("/").filter(Boolean).pop() ?? path;
  return FIXTURE_FILE_PREVIEWS[base] ?? null;
}
