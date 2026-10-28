import { describe, expect, it } from "vitest";
import {
  DATASHEET_MODULE_VERSION,
  SUPPORTED_TEMPLATE_KEY,
  SUPPORTED_TEMPLATE_VERSION,
  isSupportedTemplate,
} from "./template";

describe("isSupportedTemplate", () => {
  it("accepts exactly the implemented layout", () => {
    expect(
      isSupportedTemplate({
        template_key: SUPPORTED_TEMPLATE_KEY,
        template_version: SUPPORTED_TEMPLATE_VERSION,
      }),
    ).toBe(true);
    expect(
      isSupportedTemplate({ template_key: "Standard-Product-Sheet", template_version: "1" }),
    ).toBe(true);
  });

  it("rejects foreign keys, wrong versions and missing fields", () => {
    expect(isSupportedTemplate({ template_key: "flyer", template_version: 1 })).toBe(false);
    expect(
      isSupportedTemplate({ template_key: SUPPORTED_TEMPLATE_KEY, template_version: 2 }),
    ).toBe(false);
    expect(isSupportedTemplate({ template_key: SUPPORTED_TEMPLATE_KEY })).toBe(false);
    expect(isSupportedTemplate({})).toBe(false);
    expect(isSupportedTemplate(null)).toBe(false);
  });

  it("publishes a module version for downstream apps", () => {
    expect(DATASHEET_MODULE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
