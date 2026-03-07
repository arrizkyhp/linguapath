import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KeywordBadges } from '../components/KeywordBadges';

describe('KeywordBadges', () => {
  const keywords = ['apple', 'banana', 'cherry', 'date'];

  it('renders all keywords', () => {
    render(
      <KeywordBadges
        keywords={keywords}
        detectedKeywords={[]}
      />
    );

    keywords.forEach((kw) => {
      expect(screen.getByText(kw)).toBeInTheDocument();
    });
  });

  it('shows detected badge style for detected keywords', () => {
    const detectedKeywords = ['banana', 'date'];
    render(
      <KeywordBadges
        keywords={keywords}
        detectedKeywords={detectedKeywords}
      />
    );

    const bananaBadge = screen.getByText('banana');
    expect(bananaBadge).toHaveClass('bg-green-100');
    expect(bananaBadge).toHaveClass('text-green-700');
    expect(bananaBadge).toHaveClass('border-green-300');

    const dateBadge = screen.getByText('date');
    expect(dateBadge).toHaveClass('bg-green-100');
    expect(dateBadge).toHaveClass('text-green-700');
    expect(dateBadge).toHaveClass('border-green-300');
  });

  it('shows non-detected badge style for non-detected keywords', () => {
    const detectedKeywords = ['banana'];
    render(
      <KeywordBadges
        keywords={keywords}
        detectedKeywords={detectedKeywords}
      />
    );

    const appleBadge = screen.getByText('apple');
    expect(appleBadge).toHaveClass('bg-neutral-100');
    expect(appleBadge).toHaveClass('text-neutral-500');
    expect(appleBadge).toHaveClass('border-neutral-200');
  });

  it('renders check circle icon for detected keywords', () => {
    const detectedKeywords = ['apple'];
    render(
      <KeywordBadges
        keywords={keywords}
        detectedKeywords={detectedKeywords}
      />
    );

    expect(screen.getByRole('img', { name: /check/i })).toBeInTheDocument();
  });
});
