import React, { ChangeEvent, Dispatch, KeyboardEvent, SetStateAction } from 'react';

import { decimalTwo } from '../utils/format';

const CloseTradePriceInput = ({
  batchId,
  closeTradePrices,
  setCloseTradePrices,
}: {
  batchId: string;
  closeTradePrices: { [key: string]: number | null };
  setCloseTradePrices: Dispatch<SetStateAction<{ [key: string]: number | null }>>;
}) => {
  const storeCloseTradePrice = async (value: string) =>
    fetch('/api/setRedisKey', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: batchId, value }),
    });

  const formatValue = (value: string) => value && decimalTwo(parseFloat(value) || 0);

  const act = async (e: ChangeEvent<HTMLInputElement> | KeyboardEvent<HTMLInputElement>) => {
    // TODO Remove type casting (unexpectedly required after migrating from Yarn to npm)
    const value = formatValue((e.target as HTMLInputElement).value);
    if (value === '0.00' || value === '') {
      setCloseTradePrices({ ...closeTradePrices, [batchId]: null });
      await deleteKey();
    } else {
      setCloseTradePrices({ ...closeTradePrices, [batchId]: Number(value) });
      await storeCloseTradePrice(value);
    }
  };

  const deleteKey = async () =>
    fetch(`/api/deleteRedisKey?key=${batchId}`, {
      method: 'PUT',
    });

  const handleKeyPress = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      await act(e);
    }
  };

  const handleBlur = async (e: ChangeEvent<HTMLInputElement>) => await act(e);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
    setCloseTradePrices({ ...closeTradePrices, [batchId]: Number(e.target.value) });

  return (
    <input
      style={{ width: '65px', textAlign: 'right' }}
      type="number"
      id="closeTradePrice"
      name="closeTradePrice"
      min="0"
      step="0.01"
      placeholder="0.00"
      value={formatValue(String(closeTradePrices[batchId])) || ''}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyPress={handleKeyPress}
    />
  );
};

export default CloseTradePriceInput;
