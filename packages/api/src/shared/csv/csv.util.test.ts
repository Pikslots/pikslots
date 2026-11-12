import { escapeCsvValue, toCsv } from './csv.util';

describe('escapeCsvValue', () => {
  it('returns an empty string for null and undefined', () => {
    expect(escapeCsvValue(null)).toBe('');
    expect(escapeCsvValue(undefined)).toBe('');
  });

  it('leaves plain values untouched', () => {
    expect(escapeCsvValue('John Doe')).toBe('John Doe');
    expect(escapeCsvValue(42)).toBe('42');
  });

  it('quotes values containing commas, quotes or line breaks', () => {
    expect(escapeCsvValue('Doe, John')).toBe('"Doe, John"');
    expect(escapeCsvValue('He said "hi"')).toBe('"He said ""hi"""');
    expect(escapeCsvValue('line one\nline two')).toBe('"line one\nline two"');
  });

  it('neutralises spreadsheet formulas', () => {
    expect(escapeCsvValue('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
    expect(escapeCsvValue('+1234')).toBe("'+1234");
    expect(escapeCsvValue('@cmd')).toBe("'@cmd");
    expect(escapeCsvValue('-cmd')).toBe("'-cmd");
  });

  it('does not mangle negative numbers', () => {
    expect(escapeCsvValue(-5)).toBe('-5');
    expect(escapeCsvValue('-5.25')).toBe('-5.25');
  });

  it('quotes a formula that also contains a comma', () => {
    expect(escapeCsvValue('=HYPERLINK("a","b")')).toBe(
      '"\'=HYPERLINK(""a"",""b"")"',
    );
  });
});

describe('toCsv', () => {
  it('returns only the header row when there are no rows', () => {
    expect(toCsv(['First Name', 'Email'], [])).toBe('First Name,Email');
  });

  it('joins the header and rows with CRLF', () => {
    const csv = toCsv(
      ['First Name', 'Email', 'Notes'],
      [
        ['John', 'john@example.com', null],
        ['Jane', 'jane@example.com', 'VIP, repeat customer'],
      ],
    );

    expect(csv).toBe(
      [
        'First Name,Email,Notes',
        'John,john@example.com,',
        'Jane,jane@example.com,"VIP, repeat customer"',
      ].join('\r\n'),
    );
  });
});
