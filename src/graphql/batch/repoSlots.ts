export interface RepoRef {
  owner: string;
  name: string;
  fullName: string;
}

export function parseRepoFull(repo: string): RepoRef | null {
  const slash = repo.indexOf("/");
  if (slash < 0) return null;
  const owner = repo.slice(0, slash);
  const name = repo.slice(slash + 1);
  if (!owner || !name) return null;
  return { owner, name, fullName: repo };
}
