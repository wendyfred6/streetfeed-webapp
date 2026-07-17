import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NewPostSheet from './NewPostSheet.jsx';
import EditPostSheet from './EditPostSheet.jsx';
import CategoryPicker from './CategoryPicker.jsx';
import { CATEGORY_TREE } from '../utils/categories.js';

// HouseNumberPicker (used by houseRow/singleHouseField) fetches addresses via api.
vi.mock('../api/client.js', () => ({
  api: { get: vi.fn(() => Promise.resolve(['1', '2', '3'])) },
}));

const USER = { house_number: '52' };

describe('NewPostSheet (FRE-316 extraction)', () => {
  it('melding: shows Onderwerp + house row + required description, and submits the right payload', async () => {
    const onSubmit = vi.fn();
    render(
      <NewPostSheet onClose={vi.fn()} onBack={vi.fn()} onSubmit={onSubmit}
        streetId={1} user={USER} initialCat="melding" initialType={null} />
    );

    expect(screen.getByText('Onderwerp *')).toBeInTheDocument();
    expect(screen.getByText('Van nr. *')).toBeInTheDocument();
    expect(screen.getByText('Details *')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Kort en duidelijk'), { target: { value: 'Kapotte lantaarnpaal' } });
    const textareas = document.querySelectorAll('textarea');
    fireEvent.change(textareas[0], { target: { value: 'Staat al een week uit.' } });

    fireEvent.click(screen.getByText('Plaatsen'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      category: 'melding',
      title: 'Kapotte lantaarnpaal',
      body: 'Staat al een week uit.',
    })));
  });

  it('lostandfound + verloren: Situatie precedes the object field, label/placeholder adapt, no Ophaallocatie field, title auto-generates as "Verloren - {object}" (revised 2026-07-17)', async () => {
    const onSubmit = vi.fn();
    render(
      <NewPostSheet onClose={vi.fn()} onBack={vi.fn()} onSubmit={onSubmit}
        streetId={1} user={USER} initialCat="lostandfound" initialType={null} />
    );

    const situatieLabel = screen.getByText('Situatie *');
    const titleLabel = screen.getByText('Wat ben je verloren of heb je gevonden? *');
    expect(screen.queryByText('Van nr. *')).not.toBeInTheDocument();
    // Figma's Lost & Found mockup shows Situatie above the object-description
    // field, not below it (this file previously had it backwards).
    expect(situatieLabel.compareDocumentPosition(titleLabel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.change(document.querySelectorAll('select')[0], { target: { value: 'verloren' } });

    // Confirmed against Wendy's Verloren screenshot: label/placeholder adapt
    // once Situatie is chosen, and there's no Ophaallocatie field at all.
    expect(screen.getByText('Wat ben je verloren? *')).toBeInTheDocument();
    expect(screen.queryByText('Ophaallocatie *')).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Sleutelbos met rood label'), { target: { value: 'Sleutelbos kwijt' } });
    fireEvent.click(screen.getByText('Plaatsen'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      category: 'lostandfound',
      subType: 'verloren',
      title: 'Verloren - Sleutelbos kwijt',
    })));
  });

  it('lostandfound + gevonden: label/placeholder adapt, no Ophaallocatie field, title auto-generates as "Gevonden - {object}" (revised 2026-07-17)', async () => {
    const onSubmit = vi.fn();
    render(
      <NewPostSheet onClose={vi.fn()} onBack={vi.fn()} onSubmit={onSubmit}
        streetId={1} user={USER} initialCat="lostandfound" initialType={null} />
    );

    fireEvent.change(document.querySelectorAll('select')[0], { target: { value: 'gevonden' } });

    expect(screen.getByText('Wat heb je gevonden? *')).toBeInTheDocument();
    expect(screen.queryByText('Ophaallocatie *')).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Zwarte lederen handschoen'), { target: { value: 'Zwarte want' } });
    fireEvent.click(screen.getByText('Plaatsen'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      category: 'lostandfound',
      subType: 'gevonden',
      title: 'Gevonden - Zwarte want',
    })));
  });

  it('straatzaken: no user-facing Title/house-row/Attachment, requires Situatie, and auto-generates the title from it (FRE-375)', async () => {
    const onSubmit = vi.fn();
    render(
      <NewPostSheet onClose={vi.fn()} onBack={vi.fn()} onSubmit={onSubmit}
        streetId={1} user={USER} initialCat="straatzaken" initialType={null} />
    );

    expect(screen.queryByText('Titel *')).not.toBeInTheDocument();
    expect(screen.getByText('Situatie *')).toBeInTheDocument();
    expect(screen.queryByText('Van nr. *')).not.toBeInTheDocument();
    expect(screen.queryByText('Tijd van')).not.toBeInTheDocument();
    expect(document.querySelectorAll('input[type="file"]').length).toBe(0);
    expect(screen.getByText('Informeer je buren over tijdelijke situaties in de straat.')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Plaatsen'));
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(document.querySelectorAll('select')[0], { target: { value: 'container' } });
    fireEvent.click(screen.getByText('Plaatsen'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      category: 'straatzaken',
      subType: 'container',
      title: 'Container',
    })));
  });

  it('bezorging + pakket_aangenomen: labels the house-number fields "Voor huisnummer"/"Toevoeging" (FRE-378) and shows the tailored intro text (FRE-377)', () => {
    render(
      <NewPostSheet onClose={vi.fn()} onBack={vi.fn()} onSubmit={vi.fn()}
        streetId={1} user={USER} initialCat="bezorging" initialType="pakket_aangenomen" />
    );
    expect(screen.getByText('Voor huisnummer *')).toBeInTheDocument();
    expect(screen.getByText('Voor welk huisnummer is het pakket bedoeld?')).toBeInTheDocument();
    // Attachment is enabled for Pakket aangenomen, with its own helper copy —
    // unlike Pakket gezocht below, which has nothing to photograph.
    expect(document.querySelectorAll('input[type="file"]').length).toBeGreaterThan(0);
    expect(screen.getByText('Een foto helpt de ontvanger te bevestigen dat het om zijn/haar pakket gaat.')).toBeInTheDocument();
  });

  it('lostandfound / evenement: use the tailored title-field labels instead of a generic fallback (FRE-379)', () => {
    render(
      <NewPostSheet onClose={vi.fn()} onBack={vi.fn()} onSubmit={vi.fn()}
        streetId={1} user={USER} initialCat="lostandfound" initialType={null} />
    );
    expect(screen.getByText('Wat ben je verloren of heb je gevonden? *')).toBeInTheDocument();

    render(
      <NewPostSheet onClose={vi.fn()} onBack={vi.fn()} onSubmit={vi.fn()}
        streetId={1} user={USER} initialCat="evenement" initialType={null} />
    );
    expect(screen.getByText('Evenement *')).toBeInTheDocument();
  });

  it('evenement: does not show a house-number row (FRE-376)', () => {
    render(
      <NewPostSheet onClose={vi.fn()} onBack={vi.fn()} onSubmit={vi.fn()}
        streetId={1} user={USER} initialCat="evenement" initialType={null} />
    );
    expect(screen.queryByText('Van nr. *')).not.toBeInTheDocument();
    expect(screen.getByText('Datum *')).toBeInTheDocument();
  });

  it('evenement: date/time fields show "Kies" until picked, then the chosen value, via the real native input underneath (FRE-374)', async () => {
    const onSubmit = vi.fn();
    render(
      <NewPostSheet onClose={vi.fn()} onBack={vi.fn()} onSubmit={onSubmit}
        streetId={1} user={USER} initialCat="evenement" initialType={null} />
    );

    expect(screen.getAllByText('Kies').length).toBe(2);

    fireEvent.change(screen.getByPlaceholderText('Bijv. Straatborrel Kerst'), { target: { value: 'Straatborrel' } });
    fireEvent.change(document.querySelector('input[type="date"]'), { target: { value: '2026-07-20' } });
    fireEvent.change(document.querySelector('input[type="time"]'), { target: { value: '18:00' } });

    expect(screen.getByText('20 jul 2026')).toBeInTheDocument();
    expect(screen.getByText('18:00')).toBeInTheDocument();
    expect(screen.queryAllByText('Kies').length).toBe(0);

    fireEvent.click(screen.getByText('Plaatsen'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      category: 'evenement',
      eventDate: '2026-07-20',
      eventTime: '18:00',
    })));
  });

  it('DateField: clicking the display actively opens/focuses the underlying native input, not just passive tap-through (FRE-374 interaction fix)', () => {
    render(
      <NewPostSheet onClose={vi.fn()} onBack={vi.fn()} onSubmit={vi.fn()}
        streetId={1} user={USER} initialCat="evenement" initialType={null} />
    );

    const dateInput = document.querySelector('input[type="date"]');
    const timeInput = document.querySelector('input[type="time"]');
    expect(document.activeElement).not.toBe(dateInput);

    fireEvent.click(screen.getAllByText('Kies')[0]);
    expect(document.activeElement).toBe(dateInput);

    fireEvent.click(screen.getAllByText('Kies')[1]);
    expect(document.activeElement).toBe(timeInput);
  });

  it('bezorging + pakket_gezocht: hides the title input, shows the "own house number" helper text, and can submit immediately', async () => {
    const onSubmit = vi.fn();
    render(
      <NewPostSheet onClose={vi.fn()} onBack={vi.fn()} onSubmit={onSubmit}
        streetId={1} user={USER} initialCat="bezorging" initialType="pakket_gezocht" />
    );

    expect(screen.queryByText('Titel *')).not.toBeInTheDocument();
    expect(screen.getByText(/Je eigen huisnummer staat al bij je bericht/)).toBeInTheDocument();
    // Nothing to photograph when you're searching for a missing package.
    expect(document.querySelectorAll('input[type="file"]').length).toBe(0);

    fireEvent.click(screen.getByText('Plaatsen'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      category: 'bezorging',
      subType: 'pakket_gezocht',
      title: 'Pakket gezocht voor nr. 52',
    })));
  });
});

describe('EditPostSheet (FRE-316 extraction + FRE-311-style sub_type drift fix)', () => {
  it('shows the single house-number field for a "pakket_aangenomen" post (previously broken: EditPostSheet only recognized the legacy "bezorgd"/"have" aliases, not the current CategoryPicker key)', () => {
    const post = {
      id: 1, category: 'bezorging', sub_type: 'pakket_aangenomen',
      title: 'Pakket aangenomen voor nr. 12', body: '', start_house: '12',
    };
    render(<EditPostSheet post={post} onClose={vi.fn()} onSave={vi.fn()} streetId={1} />);
    expect(screen.getByText('Voor huisnummer')).toBeInTheDocument();
  });

  it('lostandfound: shows title + description, no house row, no Ophaallocatie field, and pre-fills Situatie from the post (FRE-317, revised 2026-07-17)', () => {
    const post = { id: 3, category: 'lostandfound', sub_type: 'gevonden', title: 'Gevonden - Zwarte want', body: '' };
    render(<EditPostSheet post={post} onClose={vi.fn()} onSave={vi.fn()} streetId={1} />);
    expect(screen.getByText('Titel')).toBeInTheDocument();
    expect(screen.queryByText('Van nr.')).not.toBeInTheDocument();
    expect(screen.getByText('Situatie')).toBeInTheDocument();
    expect(screen.queryByText('Ophaallocatie')).not.toBeInTheDocument();
  });

  it('straatzaken: shows Situatie and date range, no house row, no time fields, no link field (FRE-375)', () => {
    const post = { id: 2, category: 'straatzaken', sub_type: 'container', title: 'Werkzaamheden', body: 'Tekst', link: '' };
    render(<EditPostSheet post={post} onClose={vi.fn()} onSave={vi.fn()} streetId={1} />);
    expect(screen.getByText('Situatie')).toBeInTheDocument();
    expect(screen.getByText('Datum van')).toBeInTheDocument();
    expect(screen.queryByText('Van nr.')).not.toBeInTheDocument();
    expect(screen.queryByText('Tijd van')).not.toBeInTheDocument();
    expect(screen.queryByText('Externe link')).not.toBeInTheDocument();
  });
});

describe('CategoryPicker (FRE-316 extraction)', () => {
  it('drills into a sub-tree and reports the leaf category/type back', async () => {
    const onSelect = vi.fn();
    render(<CategoryPicker onClose={vi.fn()} onSelect={onSelect} />);

    expect(screen.getByText('Wat wil je delen?')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Bezorging'));

    expect(await screen.findByText('Pakket gezocht')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Pakket gezocht'));

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith('bezorging', 'pakket_gezocht'), { timeout: 500 });
  });

  it('straatzaken is now a flat leaf, not a drill-down tree (FRE-367)', async () => {
    expect(CATEGORY_TREE.find(c => c.key === 'straatzaken').types).toBeNull();

    const onSelect = vi.fn();
    render(<CategoryPicker onClose={vi.fn()} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Straatzaken'));

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith('straatzaken', null), { timeout: 500 });
  });

  it('lostandfound is now a flat leaf too, not a Verloren/Gevonden drill-down (FRE-368)', async () => {
    expect(CATEGORY_TREE.find(c => c.key === 'lostandfound').types).toBeNull();

    const onSelect = vi.fn();
    render(<CategoryPicker onClose={vi.fn()} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Lost & Found'));

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith('lostandfound', null), { timeout: 500 });
  });
});
