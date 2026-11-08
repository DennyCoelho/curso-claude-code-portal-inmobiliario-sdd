"use client";

import { useController, useWatch, type Control } from "react-hook-form";
import type { KeyboardEvent } from "react";
import type { CatalogFilterValues } from "@/lib/property-filters";
import { adjacentPriceSliderIndex, centsAsPrice, formatPriceInput, getPriceSliderValues, maximumPriceSliderIndex, maximumSliderPrice, priceToSliderIndex, sliderIndexToPrice } from "@/lib/property-price-range";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const priceFieldClassName = "mt-1 min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2 text-sm font-semibold text-slate-900";

function handleArrowKey(event: KeyboardEvent<HTMLInputElement>, price: number, update: (index: number) => void) {
  const direction = event.key === "ArrowLeft" || event.key === "ArrowDown" ? -1
    : event.key === "ArrowRight" || event.key === "ArrowUp" ? 1 : null;
  if (direction === null) return;
  event.preventDefault();
  update(adjacentPriceSliderIndex(price, direction));
}

export function PropertyPriceRange({ control }: { control: Control<CatalogFilterValues> }) {
  const operation = useWatch({ control, name: "operation" });
  const { field: { ref: minimumRef, ...minField }, fieldState: minState } = useController({ control, name: "minPrice" });
  const { field: { ref: maximumRef, ...maxField }, fieldState: maxState } = useController({ control, name: "maxPrice" });
  const { minimum, maximum } = getPriceSliderValues(minField.value, maxField.value);
  const minimumIndex = priceToSliderIndex(minimum);
  const maximumIndex = priceToSliderIndex(maximum);
  const left = Math.min(minimumIndex, maximumIndex) / maximumPriceSliderIndex * 100;
  const right = Math.max(minimumIndex, maximumIndex) / maximumPriceSliderIndex * 100;
  const validationMessage = minState.error?.message ?? maxState.error?.message;
  const updateMinimum = (index: number) => minField.onChange(formatPriceInput(centsAsPrice(sliderIndexToPrice(Math.min(index, priceToSliderIndex(maximum, "floor"))) * 100)));
  const updateMaximum = (index: number) => maxField.onChange(formatPriceInput(centsAsPrice(sliderIndexToPrice(Math.max(index, priceToSliderIndex(minimum, "ceil"))) * 100)));

  return (
    <fieldset className="min-w-0 border-t border-slate-200 pt-5">
      <legend className="float-left mb-3 w-full text-sm font-semibold text-slate-900">Faixa de preço {operation === "RENT" ? "mensal" : ""}</legend>
      <p id="price-range-help" className="clear-both text-xs leading-5 text-slate-500">Digite os valores ou ajuste as alças.</p>
      <div className="mt-3 grid min-w-0 grid-cols-2 gap-2 text-slate-900">
        <label htmlFor="filter-minPrice-value" className="min-w-0 text-xs text-slate-500">
          Mínimo (R$)
          <input ref={minimumRef} id="filter-minPrice-value" name={minField.name} type="text" inputMode="decimal" maxLength={20}
            value={minField.value} placeholder="0,00" onChange={(event) => minField.onChange(event.target.value)}
            onBlur={() => { minField.onChange(formatPriceInput(minField.value)); minField.onBlur(); }}
            aria-invalid={Boolean(minState.error)} aria-describedby={validationMessage ? "price-range-help price-range-error" : "price-range-help"}
            className={priceFieldClassName} />
        </label>
        <label htmlFor="filter-maxPrice-value" className="min-w-0 text-xs text-slate-500">
          Máximo (R$)
          <input ref={maximumRef} id="filter-maxPrice-value" name={maxField.name} type="text" inputMode="decimal" maxLength={20}
            value={maxField.value} placeholder="10.000.000,00" onChange={(event) => maxField.onChange(event.target.value)}
            onBlur={() => { maxField.onChange(formatPriceInput(maxField.value)); maxField.onBlur(); }}
            aria-invalid={Boolean(maxState.error)} aria-describedby={validationMessage ? "price-range-help price-range-error" : "price-range-help"}
            className={priceFieldClassName} />
        </label>
      </div>
      <div className="relative mt-2 h-11">
        <div className="absolute top-5 h-1.5 w-full rounded-full bg-slate-200" />
        <div className="absolute top-5 h-1.5 rounded-full bg-emerald-700" style={{ left: `${left}%`, width: `${right - left}%` }} />
        <label className="sr-only" htmlFor="filter-minPrice">Preço mínimo (R$)</label>
        <input id="filter-minPrice" type="range" min="0" max={maximumPriceSliderIndex} step="1"
          value={minimumIndex} onBlur={minField.onBlur} onChange={(event) => updateMinimum(Number(event.target.value))}
          onKeyDown={(event) => handleArrowKey(event, minimum, updateMinimum)}
          aria-valuemin={0} aria-valuemax={maximumSliderPrice} aria-valuenow={minimum} aria-valuetext={currencyFormatter.format(minimum)} aria-invalid={Boolean(minState.error)} aria-describedby={validationMessage ? "price-range-help price-range-error" : "price-range-help"}
          className="price-range-input" style={{ zIndex: minimum === maximumSliderPrice ? 4 : 2 }} />
        <label className="sr-only" htmlFor="filter-maxPrice">Preço máximo (R$)</label>
        <input id="filter-maxPrice" type="range" min="0" max={maximumPriceSliderIndex} step="1"
          value={maximumIndex} onBlur={maxField.onBlur} onChange={(event) => updateMaximum(Number(event.target.value))}
          onKeyDown={(event) => handleArrowKey(event, maximum, updateMaximum)}
          aria-valuemin={0} aria-valuemax={maximumSliderPrice} aria-valuenow={maximum} aria-valuetext={currencyFormatter.format(maximum)} aria-invalid={Boolean(maxState.error)} aria-describedby={validationMessage ? "price-range-help price-range-error" : "price-range-help"}
          className="price-range-input" style={{ zIndex: 3 }} />
      </div>
      {validationMessage ? <p id="price-range-error" role="alert" className="mt-2 text-sm text-red-700">{validationMessage}</p> : null}
    </fieldset>
  );
}
