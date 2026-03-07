import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuestionCard } from '../components/QuestionCard';

describe('QuestionCard', () => {
  const question = 'What is the capital of France?';
  const options = ['London', 'Berlin', 'Paris', 'Madrid'];
  const correctAnswer = 2;

  it('renders question and options', () => {
    render(
      <QuestionCard
        question={question}
        options={options}
        selectedAnswer={null}
        correctAnswer={correctAnswer}
        showExplanation={false}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText(question)).toBeInTheDocument();
    expect(screen.getByText('London')).toBeInTheDocument();
    expect(screen.getByText('Paris')).toBeInTheDocument();
    expect(screen.getByText('Madrid')).toBeInTheDocument();
  });

  it('calls onSelect when option is clicked', () => {
    const onSelect = vi.fn();
    render(
      <QuestionCard
        question={question}
        options={options}
        selectedAnswer={null}
        correctAnswer={correctAnswer}
        showExplanation={false}
        onSelect={onSelect}
      />
    );

    const parisBtn = screen.getByText('Paris');
    userEvent.click(parisBtn);
    expect(onSelect).toHaveBeenCalled();
  });

  it('highlights correct answer when showExplanation is true', () => {
    render(
      <QuestionCard
        question={question}
        options={options}
        selectedAnswer={1}
        correctAnswer={correctAnswer}
        showExplanation={true}
        onSelect={vi.fn()}
      />
    );

    const correctOption = screen.getByText('Paris');
    expect(correctOption).toHaveClass('border-green-400');
    expect(correctOption).toHaveClass('bg-green-50');
    expect(correctOption).toHaveClass('text-green-700');
  });

  it('highlights incorrect selection when showExplanation is true', () => {
    render(
      <QuestionCard
        question={question}
        options={options}
        selectedAnswer={1}
        correctAnswer={correctAnswer}
        showExplanation={true}
        onSelect={vi.fn()}
      />
    );

    const incorrectOption = screen.getByText('Berlin');
    expect(incorrectOption).toHaveClass('border-red-400');
    expect(incorrectOption).toHaveClass('bg-red-50');
    expect(incorrectOption).toHaveClass('text-red-700');
  });

  it('disables options when showExplanation is true', () => {
    render(
      <QuestionCard
        question={question}
        options={options}
        selectedAnswer={1}
        correctAnswer={correctAnswer}
        showExplanation={true}
        onSelect={vi.fn()}
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('renders explanation when showExplanation and explanation are provided', () => {
    render(
      <QuestionCard
        question={question}
        options={options}
        selectedAnswer={null}
        correctAnswer={correctAnswer}
        showExplanation={true}
        explanation="Paris is the capital and most populous city of France."
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText('💡')).toBeInTheDocument();
    expect(screen.getByText('Paris is the capital and most populous city of France.')).toBeInTheDocument();
  });
});
