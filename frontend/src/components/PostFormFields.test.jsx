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

    expect(screen.getByText('Onderwerp')).toBeInTheDocument();
    expect(screen.getByText('Van nr.')).toBeInTheDocument();
    expect(screen.getByText('Details')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Kort en duidelijk'), { target: { value: 'Kapotte lantaarnpaal' } });
    const textareas = document.querySelectorAll('textarea');
    fireEvent.change(textareas[0], { target: { value: 'Staat al een week uit.' } });

    fireEvent.click(screen.getByText('Plaats bericht'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      category: 'melding',
      title: 'Kapotte lantaarnpaal',
      body: 'Staat al een week uit.',
    })));
  });

  it('lostandfound + verloren: Situatie precedes the object field, label/placeholder adapt, no Ophaallocatie field, title auto-generates as "Verloren - {object}" (revised 2026-07-18)', async () => {
    const onSubmit = vi.fn();
    render(
      <NewPostSheet onClose={vi.fn()} onBack={vi.fn()} onSubmit={onSubmit}
        streetId={1} user={USER} initialCat="lostandfound" initialType={null} />
    );

    const situatieLabel = screen.getByText('Situatie');
    const titleLabel = screen.getByText('Wat ben je verloren of heb je gevonden?');
    expect(screen.queryByText('Van nr.')).not.toBeInTheDocument();
    // Figma's Lost & Found mockup shows Situatie above the object-description
    // field, not below it (this file previously had it backwards).
    expect(situatieLabel.compareDocumentPosition(titleLabel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.change(document.querySelectorAll('select')[0], { target: { value: 'verloren' } });

    // Confirmed against Wendy's Verloren screenshot: label/placeholder adapt
    // once Situatie is chosen, and there's no Ophaallocatie field at all.
    expect(screen.getByText('Wat ben je verloren?')).toBeInTheDocument();
    expect(screen.queryByText('Ophaallocatie')).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Sleutelbos met rood label'), { target: { value: 'Sleutelbos kwijt' } });
    fireEvent.click(screen.getByText('Plaats bericht'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      category: 'lostandfound',
      subType: 'verloren',
      title: 'Verloren - Sleutelbos kwijt',
    })));
  });

  it('lostandfound + gevonden: label/placeholder adapt, no Ophaallocatie field, title auto-generates as "Gevonden - {object}" (revised 2026-07-18)', async () => {
    const onSubmit = vi.fn();
    render(
      <NewPostSheet onClose={vi.fn()} onBack={vi.fn()} onSubmit={onSubmit}
        streetId={1} user={USER} initialCat="lostandfound" initialType={null} />
    );

    fireEvent.change(document.querySelectorAll('select')[0], { target: { value: 'gevonden' } });

    expect(screen.getByText('Wat heb je gevonden?')).toBeInTheDocument();
    expect(screen.queryByText('Ophaallocatie')).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Zwarte lederen handschoen'), { target: { value: 'Zwarte want' } });
    fireEvent.click(screen.getByText('Plaats bericht'));

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

    expect(screen.queryByText('Titel')).not.toBeInTheDocument();
    expect(screen.getByText('Situatie')).toBeInTheDocument();
    expect(screen.queryByText('Van nr.')).not.toBeInTheDocument();
    expect(screen.queryByText('Tijd van')).not.toBeInTheDocument();
    expect(document.querySelectorAll('input[type="file"]').length).toBe(0);
    expect(screen.getByText('Informeer je buren over tijdelijke situaties in de straat.')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Plaats bericht'));
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(document.querySelectorAll('select')[0], { target: { value: 'container' } });
    fireEvent.click(screen.getByText('Plaats bericht'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      category: 'straatzaken',
      subType: 'container',
      title: 'Container',
    })));
  });

  it('bezorging + pakket_aangenomen: labels the house-number fields "Voor huisnummer"/"Toevoeging" (FRE-378) and shows the static intro text (revised 2026-07-18, confirmed against Figma)', () => {
    render(
      <NewPostSheet onClose={vi.fn()} onBack={vi.fn()} onSubmit={vi.fn()}
        streetId={1} user={USER} initialCat="bezorging" initialType={null} />
    );
    // Pakket aangenomen/gezocht is an in-post Situatie choice now, not a
    // CategoryPicker drill-down (Product Model Alignment v1, 2026-07-18).
    fireEvent.change(document.querySelectorAll('select')[0], { target: { value: 'pakket_aangenomen' } });

    expect(screen.getByText('Voor huisnummer')).toBeInTheDocument();
    // Intro text is static regardless of Situatie (confirmed against Figma,
    // 2026-07-18) — it previously varied by isGezocht, which Figma doesn't do.
    expect(screen.getByText('Een pakket aangenomen voor een buur of op zoek naar je pakket?')).toBeInTheDocument();
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
    expect(screen.getByText('Wat ben je verloren of heb je gevonden?')).toBeInTheDocument();

    render(
      <NewPostSheet onClose={vi.fn()} onBack={vi.fn()} onSubmit={vi.fn()}
        streetId={1} user={USER} initialCat="evenement" initialType={null} />
    );
    // Field label matches the heading text now that neither carries an
    // asterisk — scope to the label element to disambiguate.
    expect(screen.getByText('Evenement', { selector: 'label' })).toBeInTheDocument();
  });

  it('evenement: does not show a house-number row (FRE-376)', () => {
    render(
      <NewPostSheet onClose={vi.fn()} onBack={vi.fn()} onSubmit={vi.fn()}
        streetId={1} user={USER} initialCat="evenement" initialType={null} />
    );
    expect(screen.queryByText('Van nr.')).not.toBeInTheDocument();
    expect(screen.getByText('Datum')).toBeInTheDocument();
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

    fireEvent.click(screen.getByText('Plaats bericht'));

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
        streetId={1} user={USER} initialCat="bezorging" initialType={null} />
    );
    fireEvent.change(document.querySelectorAll('select')[0], { target: { value: 'pakket_gezocht' } });

    expect(screen.queryByText('Titel')).not.toBeInTheDocument();
    expect(screen.getByText(/Je eigen huisnummer staat al bij je bericht/)).toBeInTheDocument();
    // Nothing to photograph when you're searching for a missing package.
    expect(document.querySelectorAll('input[type="file"]').length).toBe(0);

    fireEvent.click(screen.getByText('Plaats bericht'));

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

  it('lostandfound: shows the situatie-tailored object-description field (not a generic "Titel"), no house row, no Ophaallocatie field, and pre-fills Situatie from the post (FRE-317, revised 2026-07-19: edit keeps the same tailored label as create)', () => {
    const post = { id: 3, category: 'lostandfound', sub_type: 'gevonden', title: 'Gevonden - Zwarte want', body: '' };
    render(<EditPostSheet post={post} onClose={vi.fn()} onSave={vi.fn()} streetId={1} />);
    expect(screen.getByText('Wat heb je gevonden?')).toBeInTheDocument();
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

  it('uses the shared modal chrome (Edit Post Flow v0.1 + Confirmation Patterns v0.1, 2026-07-19): no back button and no Annuleren — the header Cross is the single exit action — and the CTA reads "Wijzigingen opslaan"', async () => {
    const onClose = vi.fn();
    const post = { id: 4, category: 'algemeen', sub_type: null, title: 'Bank te koop', body: '' };
    render(<EditPostSheet post={post} onClose={onClose} onSave={vi.fn()} streetId={1} />);

    expect(screen.getByText('Wijzigingen opslaan')).toBeInTheDocument();
    expect(screen.queryByLabelText('Terug')).not.toBeInTheDocument();
    expect(screen.queryByText('Annuleren')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Sluiten')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Sluiten'));
    await waitFor(() => expect(onClose).toHaveBeenCalled(), { timeout: 500 });
  });

  it('guards edit-mode dismissal with an Unsaved Changes confirmation when the form is dirty (Confirmation Patterns v0.1, 2026-07-19): the Cross shows the sheet instead of closing directly, "Wijzigingen behouden" returns to editing, "Niet opslaan" discards and closes', async () => {
    const onClose = vi.fn();
    const post = { id: 9, category: 'algemeen', sub_type: null, title: 'Bank te koop', body: '' };
    render(<EditPostSheet post={post} onClose={onClose} onSave={vi.fn()} streetId={1} />);

    fireEvent.change(screen.getByDisplayValue('Bank te koop'), { target: { value: 'Bank te koop, gratis af te halen' } });
    fireEvent.click(screen.getByLabelText('Sluiten'));

    expect(screen.getByText('Wijzigingen niet opgeslagen')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Wijzigingen behouden'));
    expect(screen.queryByText('Wijzigingen niet opgeslagen')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Bank te koop, gratis af te halen')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Sluiten'));
    fireEvent.click(screen.getByText('Niet opslaan'));
    await waitFor(() => expect(onClose).toHaveBeenCalled(), { timeout: 500 });
  });

  it('regenerates the title from Situatie/house-number on save for a category with no title field (Bezorging) — generated fields are never user-editable, in create or edit (confirmed against Figma\'s "Edit Post Flow v0.1", 2026-07-19)', async () => {
    const onSave = vi.fn();
    const post = {
      id: 5, category: 'bezorging', sub_type: 'pakket_aangenomen',
      title: 'Pakket aangenomen voor nr. 1', body: '', start_house: '1',
    };
    render(<EditPostSheet post={post} onClose={vi.fn()} onSave={onSave} streetId={1} />);

    expect(screen.queryByText('Titel')).not.toBeInTheDocument();
    // select[0] is Situatie, select[1] is the "Voor huisnummer" picker — it's
    // already present at mount here (unlike create mode, where it only
    // appears after Situatie is chosen), so its address list is still
    // loading/disabled for a tick; wait for that before interacting.
    await waitFor(() => expect(document.querySelectorAll('select')[1]).not.toBeDisabled());
    fireEvent.change(document.querySelectorAll('select')[1], { target: { value: '2' } });
    fireEvent.click(screen.getByText('Wijzigingen opslaan'));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(5, expect.objectContaining({
      title: 'Pakket aangenomen voor nr. 2',
    })));
  });

  it('keeps a "Pakket gezocht" title unchanged when only an unrelated field (Details) is edited — regressed once when `user` wasn\'t passed through to the shared sheet (2026-07-19)', async () => {
    const onSave = vi.fn();
    const post = {
      id: 7, category: 'bezorging', sub_type: 'pakket_gezocht',
      title: 'Pakket gezocht voor nr. 52', body: '',
    };
    render(<EditPostSheet post={post} onClose={vi.fn()} onSave={onSave} streetId={1} user={USER} />);

    fireEvent.change(document.querySelectorAll('textarea')[0], { target: { value: 'Ergens in de hal gezien misschien?' } });
    fireEvent.click(screen.getByText('Wijzigingen opslaan'));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(7, expect.objectContaining({
      title: 'Pakket gezocht voor nr. 52',
    })));
  });

  it('lostandfound: pre-fills the object-description field with the bare object text (not the full generated title with its Verloren-/Gevonden- prefix baked in), and doesn\'t double-prefix on re-save after a Situatie change', async () => {
    const onSave = vi.fn();
    const post = {
      id: 8, category: 'lostandfound', sub_type: 'gevonden',
      title: 'Gevonden - Zwarte lederen handschoen', body: '',
    };
    render(<EditPostSheet post={post} onClose={vi.fn()} onSave={onSave} streetId={1} />);

    expect(screen.getByDisplayValue('Zwarte lederen handschoen')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Gevonden - Zwarte lederen handschoen')).not.toBeInTheDocument();

    fireEvent.change(document.querySelectorAll('select')[0], { target: { value: 'verloren' } });
    fireEvent.click(screen.getByText('Wijzigingen opslaan'));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(8, expect.objectContaining({
      title: 'Verloren - Zwarte lederen handschoen',
    })));
  });

  it('includes AttachmentUpload for a category/situatie that supports it, shows the real filename (not generic "Foto gekozen" text), and sends an explicit empty photoKey when the existing photo is removed', () => {
    const onSave = vi.fn();
    const post = {
      id: 6, category: 'bezorging', sub_type: 'pakket_aangenomen',
      title: 'Pakket voor nr. 12', body: '', start_house: '12',
      photo_key: 'existing-key.jpg', photo_url: '/api/uploads/existing-key.jpg',
    };
    render(<EditPostSheet post={post} onClose={vi.fn()} onSave={onSave} streetId={1} />);

    // Backend discards the original filename, so the pre-existing photo's
    // display name is derived from the storage URL — still real, dynamic
    // data, never the old hardcoded "Foto gekozen" placeholder.
    expect(screen.getByText('existing-key.jpg')).toBeInTheDocument();
    expect(screen.queryByText('Foto gekozen')).not.toBeInTheDocument();

    expect(screen.getByLabelText('Bijlage verwijderen')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Bijlage verwijderen'));
    fireEvent.click(screen.getByText('Wijzigingen opslaan'));

    expect(onSave).toHaveBeenCalledWith(6, expect.objectContaining({ photoKey: '' }));
  });
});

describe('CategoryPicker (FRE-316 extraction)', () => {
  it('bezorging is now a flat leaf, not a Pakket aangenomen/gezocht drill-down (Product Model Alignment v1, 2026-07-18)', async () => {
    expect(CATEGORY_TREE.find(c => c.key === 'bezorging').types).toBeNull();

    const onSelect = vi.fn();
    render(<CategoryPicker onClose={vi.fn()} onSelect={onSelect} />);

    expect(screen.getByText('Wat wil je delen?')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Bezorging'));

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith('bezorging', null), { timeout: 500 });
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

  it('algemeen is now a flat leaf too, not a Gezocht/Te koop/Gratis/Aanbeveling drill-down (Product Model Alignment v1, 2026-07-18)', async () => {
    expect(CATEGORY_TREE.find(c => c.key === 'algemeen').types).toBeNull();

    const onSelect = vi.fn();
    render(<CategoryPicker onClose={vi.fn()} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Algemeen'));

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith('algemeen', null), { timeout: 500 });
  });
});
