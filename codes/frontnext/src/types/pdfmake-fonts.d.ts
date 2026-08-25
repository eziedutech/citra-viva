/**
 * pdfmake ships its font container as plain JavaScript with no declaration,
 * and the published types do not describe it. Declared here as unknown rather
 * than as any, so the shape still has to be narrowed at the call site.
 */
declare module 'pdfmake/build/fonts/Roboto' {
  const fonts: unknown;
  export default fonts;
}
