import { describe, expect, test } from "bun:test";

import { csvCell, slugifyFilename, toCsv, toJson, toTsv } from "@/registry/kadal/ui/data-grid/data-grid-export";

const table = { headers: ["Name", "Note"], rows: [["Ada", "x,y"], ["Bo", 'say "hi"']] };

describe("csvCell", () => {
  test("quotes only when it must, doubling quotes inside", () => {
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("line\nbreak")).toBe('"line\nbreak"');
    expect(csvCell("a\tb", "\t")).toBe('"a\tb"');
  });

  test("serialises dates, objects and blanks", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
    expect(csvCell(new Date(0))).toBe("1970-01-01T00:00:00.000Z");
    expect(csvCell({ a: 1 })).toBe('"{""a"":1}"');
    expect(csvCell(42)).toBe("42");
  });
});

describe("toCsv / toTsv / toJson", () => {
  test("CSV has CRLF line ends and a header row", () => {
    expect(toCsv(table)).toBe('Name,Note\r\nAda,"x,y"\r\nBo,"say ""hi"""');
    expect(toCsv(table, { headers: false })).toBe('Ada,"x,y"\r\nBo,"say ""hi"""');
  });

  test("TSV uses LF and tabs, so a spreadsheet pastes it as cells", () => {
    expect(toTsv(table, { headers: false })).toBe('Ada\tx,y\nBo\t"say ""hi"""');
  });

  test("JSON keys rows by header", () => {
    expect(JSON.parse(toJson(table, { pretty: false }))).toEqual([
      { Name: "Ada", Note: "x,y" },
      { Name: "Bo", Note: 'say "hi"' },
    ]);
    expect(toJson({ headers: ["a"], rows: [[undefined]] }, { pretty: false })).toBe('[{"a":null}]');
  });
});

describe("slugifyFilename", () => {
  test("makes a filename stem", () => {
    expect(slugifyFilename("Orders · 2026")).toBe("orders-2026");
    expect(slugifyFilename("Café  menu")).toBe("cafe-menu");
    expect(slugifyFilename("!!!")).toBe("export");
    expect(slugifyFilename("", "grid")).toBe("grid");
  });
});
