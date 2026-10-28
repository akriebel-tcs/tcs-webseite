/**
 * Minimal typing for the pagination engine used by the shared datasheet
 * module. Keep this file next to the module when copying it into other apps.
 */
declare module "pagedjs" {
  export class Previewer {
    constructor(options?: Record<string, unknown>);
    preview(
      content?: Node | DocumentFragment,
      stylesheets?: Array<string | Record<string, string>>,
      renderTo?: Element,
    ): Promise<{ total?: number }>;
    polisher?: { destroy?: () => void };
    chunker?: { destroy?: () => void };
  }
}
