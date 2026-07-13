import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NewPostSheet from './NewPostSheet.jsx';
import EditPostSheet from './EditPostSheet.jsx';
import CategoryPicker from './CategoryPicker.jsx';

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
    expect(screen.getByText('Omschrijving *')).toBeInTheDocument();

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

  it('lostandfound: shows a title + description but no house-number row (FRE-317), and submits the right payload', async () => {
    const onSubmit = vi.fn();
    render(
      <NewPostSheet onClose={vi.fn()} onBack={vi.fn()} onSubmit={onSubmit}
        streetId={1} user={USER} initialCat="lostandfound" initialType="verloren" />
    );

    expect(screen.getByText('Titel *')).toBeInTheDocument();
    expect(screen.queryByText('Van nr. *')).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Bijv. Sleutelbos met rood label'), { target: { value: 'Sleutelbos kwijt' } });

    fireEvent.click(screen.getByText('Plaatsen'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      category: 'lostandfound',
      subType: 'verloren',
      title: 'Sleutelbos kwijt',
    })));
  });

  it('bezorging + pakket_gezocht: hides the title input, shows the "own house number" helper text, and can submit immediately', async () => {
    const onSubmit = vi.fn();
    render(
      <NewPostSheet onClose={vi.fn()} onBack={vi.fn()} onSubmit={onSubmit}
        streetId={1} user={USER} initialCat="bezorging" initialType="pakket_gezocht" />
    );

    expect(screen.queryByText('Titel *')).not.toBeInTheDocument();
    expect(screen.getByText(/Je eigen huisnummer staat al bij je bericht/)).toBeInTheDocument();

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
    expect(screen.getByText('Huisnummer geadresseerde')).toBeInTheDocument();
  });

  it('lostandfound: shows title + description only, no house row (FRE-317)', () => {
    const post = { id: 3, category: 'lostandfound', sub_type: 'gevonden', title: 'Zwarte want gevonden', body: '' };
    render(<EditPostSheet post={post} onClose={vi.fn()} onSave={vi.fn()} streetId={1} />);
    expect(screen.getByText('Titel')).toBeInTheDocument();
    expect(screen.queryByText('Van nr.')).not.toBeInTheDocument();
  });

  it('straatzaken: shows the van/tot house row, date range, and link field', () => {
    const post = { id: 2, category: 'straatzaken', title: 'Werkzaamheden', body: 'Tekst', link: '' };
    render(<EditPostSheet post={post} onClose={vi.fn()} onSave={vi.fn()} streetId={1} />);
    expect(screen.getByText('Van nr.')).toBeInTheDocument();
    expect(screen.getByText('Datum van')).toBeInTheDocument();
    expect(screen.getByText('Externe link')).toBeInTheDocument();
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
});
