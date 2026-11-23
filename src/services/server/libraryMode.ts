export function libraryMode(): 'legacy' | 'pilot' | 'commercial' {
  const pilot = process.env.BIBLIOTECA_LIBRARY_BETA_ENABLED === 'true';
  const commercial = process.env.BIBLIOTECA_LIBRARY_COMMERCIAL_ENABLED === 'true';
  if (pilot && commercial) throw new Error('Selecciona un solo modo de acceso para Mi Biblioteca.');
  return commercial ? 'commercial' : pilot ? 'pilot' : 'legacy';
}

export function managedLibraryEnabled() {
  return libraryMode() !== 'legacy';
}
