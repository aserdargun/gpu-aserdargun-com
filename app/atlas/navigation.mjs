export function readModuleFromUrl(url, validIds) {
  const id = url.searchParams.get("module");
  return validIds.has(id) ? id : null;
}

export function updateModuleUrl(owner, id) {
  const url = new URL(owner.location.href);
  if (id) url.searchParams.set("module", id);
  else url.searchParams.delete("module");
  url.hash = "";
  if (url.href !== owner.location.href) {
    owner.history.pushState(null, "", `${url.pathname}${url.search}`);
  }
}
