import { describe, it, expect } from 'vitest';
import { catLabel, typeLabel, CATEGORY_TREE } from './categories.js';

describe('catLabel', () => {
  it('labels current categories', () => {
    expect(catLabel('bezorging')).toBe('Bezorging');
  });

  it('falls back to legacy pre-rename category labels', () => {
    expect(catLabel('package')).toBe('Bezorging');
  });
});

describe('typeLabel', () => {
  it('labels bezorging Situatie types (chosen in-post, not via CategoryPicker drill-down)', () => {
    expect(typeLabel('bezorging', 'pakket_gezocht')).toBe('Pakket gezocht');
    expect(typeLabel('bezorging', 'pakket_aangenomen')).toBe('Pakket aangenomen');
  });

  it('labels lostandfound sub-types (previously missing from TYPE_META entirely)', () => {
    expect(typeLabel('lostandfound', 'verloren')).toBe('Verloren');
    expect(typeLabel('lostandfound', 'gevonden')).toBe('Gevonden');
  });

  it('labels straatzaken Situatie types (FRE-367: chosen in-post, not via CategoryPicker drill-down)', () => {
    expect(typeLabel('straatzaken', 'container')).toBe('Container');
    expect(typeLabel('straatzaken', 'verhuislift')).toBe('Verhuislift');
    expect(typeLabel('straatzaken', 'parkeerplek_gereserveerd')).toBe('Parkeerplek gereserveerd');
    expect(typeLabel('straatzaken', 'anders')).toBe('Anders');
  });

  it('still labels old straatzaken posts from before the tree flattened (FRE-367)', () => {
    expect(typeLabel('straatzaken', 'verhuizing')).toBe('Verhuizing');
    // Renamed concept: an old post with sub_type='parkeerplaatsen' shows the
    // current terminology, not the stale one it was created with.
    expect(typeLabel('straatzaken', 'parkeerplaatsen')).toBe('Parkeerplek gereserveerd');
  });

  it('still labels legacy algemeen sub-types not offered by the current picker', () => {
    expect(typeLabel('algemeen', 'te_leen')).toBe('Te leen');
    expect(typeLabel('algemeen', 'vraag')).toBe('Vraag');
  });

  it('falls back to the raw key for a genuinely unknown sub-type', () => {
    expect(typeLabel('algemeen', 'not_a_real_type')).toBe('not_a_real_type');
  });
});

describe('CATEGORY_TREE', () => {
  it('every leaf label matches what typeLabel resolves for its key (no drift)', () => {
    const walk = (items, cat) => {
      for (const item of items) {
        expect(typeLabel(cat, item.key)).toBe(item.label);
        if (item.types) walk(item.types, cat);
      }
    };
    for (const cat of CATEGORY_TREE) {
      if (cat.types) walk(cat.types, cat.key);
    }
  });
});
