import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { buildXlsx } = await import('../src/utils/xlsx');

describe('выгрузка в Excel', () => {
  it('настоящий .xlsx: архив читается, листы и значения на месте (кириллица, числа)', () => {
    const bytes = buildXlsx([
      { name: 'По дням', rows: [['Дата', 'Просмотры'], ['08.11.2026', 120], ['07.11.2026', 95]] },
      { name: 'Кампании', rows: [['Кампания', 'CTR, %'], ['Тест <А> & «Б»', 1.5]] },
    ]);
    const dir = mkdtempSync(join(tmpdir(), 'xlsx-'));
    const f = join(dir, 'a.xlsx');
    writeFileSync(f, bytes);
    const py = `import zipfile,sys
z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None
w=z.read('xl/workbook.xml').decode(); s1=z.read('xl/worksheets/sheet1.xml').decode(); s2=z.read('xl/worksheets/sheet2.xml').decode()
print('По дням' in w, 'Кампании' in w, '<v>120</v>' in s1, '08.11.2026' in s1, 'Тест &lt;А&gt; &amp; «Б»' in s2, '<v>1.5</v>' in s2)`;
    const out = execFileSync('python3', ['-c', py, f]).toString().trim();
    assert.equal(out, 'True True True True True True');
  });
});
