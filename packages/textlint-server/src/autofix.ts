import { Diagnostic } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";

export interface AutoFix {
  version: number;
  ruleId: string;
  fix: TextLintFixCommand;
}
export class TextlintFixRepository {
  map: Map<string, AutoFix> = new Map();

  register(doc: TextDocument, diag: Diagnostic, msg: TextLintMessage) {
    if (msg.fix && msg.ruleId) {
      const fix = {
        version: doc.version,
        ruleId: msg.ruleId,
        fix: msg.fix,
      };
      this.map.set(this.toKey(diag), fix);
    }
  }

  find(diags: Diagnostic[]): AutoFix[] {
    return diags.map((d) => this.map.get(this.toKey(d))).filter((af) => af);
  }

  clear = () => this.map.clear();

  toKey(diagnostic: Diagnostic): string {
    const range = diagnostic.range;
    return `[${range.start.line},${range.start.character},${range.end.line},${range.end.character}]-${diagnostic.code}`;
  }

  isEmpty(): boolean {
    return this.map.size < 1;
  }

  get version(): number {
    const af = this.map.values().next().value;
    return af ? af.version : -1;
  }

  sortedValues(): AutoFix[] {
    const a = Array.from(this.map.values());
    return a.sort((left, right) => {
      const lr = left.fix.range;
      const rr = right.fix.range;
      if (lr[0] === rr[0]) {
        if (lr[1] === rr[1]) {
          return 0;
        }
        return lr[1] < rr[1] ? -1 : 1;
      }
      return lr[0] < rr[0] ? -1 : 1;
    });
  }

  static overlaps(lastEdit: AutoFix, newEdit: AutoFix): boolean {
    return !!lastEdit && lastEdit.fix.range[1] > newEdit.fix.range[0];
  }

  separatedValues(filter: (fix) => boolean = () => true): AutoFix[] {
    const sv = this.sortedValues().filter(filter);
    if (sv.length < 1) {
      return sv;
    }
    const result: AutoFix[] = [];
    result.push(sv[0]);
    sv.reduce((prev, cur) => {
      if (TextlintFixRepository.overlaps(prev, cur) === false) {
        result.push(cur);
        return cur;
      }
      return prev;
    });
    return result;
  }
}
