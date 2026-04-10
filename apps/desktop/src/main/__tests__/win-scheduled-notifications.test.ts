import { escapePowerShellString, escapeXml, buildToastXml } from '../win-scheduled-notifications';

// ========================================
// escapePowerShellString
// ========================================

describe('escapePowerShellString', () => {
  it('returns empty string unchanged', () => {
    expect(escapePowerShellString('')).toBe('');
  });

  it('returns string without quotes unchanged', () => {
    expect(escapePowerShellString('hello world')).toBe('hello world');
  });

  it('escapes single quotes by doubling them', () => {
    expect(escapePowerShellString("it's fine")).toBe("it''s fine");
  });

  it('handles multiple single quotes', () => {
    expect(escapePowerShellString("a'b'c")).toBe("a''b''c");
  });

  it('does not escape double quotes', () => {
    expect(escapePowerShellString('say "hello"')).toBe('say "hello"');
  });

  it('handles Japanese characters', () => {
    expect(escapePowerShellString('僕のヒーロー')).toBe('僕のヒーロー');
  });
});

// ========================================
// escapeXml
// ========================================

describe('escapeXml', () => {
  it('escapes ampersand', () => {
    expect(escapeXml('A & B')).toBe('A &amp; B');
  });

  it('escapes angle brackets', () => {
    expect(escapeXml('<tag>')).toBe('&lt;tag&gt;');
  });

  it('escapes double quotes', () => {
    expect(escapeXml('say "hello"')).toBe('say &quot;hello&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeXml("it's")).toBe('it&apos;s');
  });

  it('handles multiple special chars', () => {
    expect(escapeXml('a < b & c > "d"')).toBe('a &lt; b &amp; c &gt; &quot;d&quot;');
  });

  it('returns plain text unchanged', () => {
    expect(escapeXml('hello world')).toBe('hello world');
  });
});

// ========================================
// buildToastXml
// ========================================

describe('buildToastXml', () => {
  it('produces valid toast XML structure', () => {
    const xml = buildToastXml('My Hero Academia', 'Odcinek 5 za 15 min');
    expect(xml).toContain('<toast>');
    expect(xml).toContain('</toast>');
    expect(xml).toContain('<text>My Hero Academia</text>');
    expect(xml).toContain('<text>Odcinek 5 za 15 min</text>');
    expect(xml).toContain('template="ToastGeneric"');
  });

  it('escapes special XML characters in title and body', () => {
    const xml = buildToastXml('A & B <Special>', 'Episode "1"');
    expect(xml).toContain('A &amp; B &lt;Special&gt;');
    expect(xml).toContain('Episode &quot;1&quot;');
  });

  it('handles Japanese titles', () => {
    const xml = buildToastXml('僕のヒーロー', 'Odcinek 10 nadawany teraz!');
    expect(xml).toContain('<text>僕のヒーロー</text>');
  });
});
