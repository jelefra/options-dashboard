import React from 'react';

import { decimalTwo } from '../utils/format';

const CloseTradePriceInput = ({ batchId, closeTradePrices, setCloseTradePrices }) => {
  const storeCloseTradePrice = async (value) =>
    fetch('/api/setRedisKey', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: batchId, value }),
    });

  const formatValue = (value) => value && decimalTwo(parseFloat(value) || 0);

  const act = async (e) => {
    const value = formatValue(e.target.value);
    if (value === '0.00' || value === '') {
      setCloseTradePrices({ ...closeTradePrices, [batchId]: null });
      await deleteKey();
    } else {
      setCloseTradePrices({ ...closeTradePrices, [batchId]: value });
      await storeCloseTradePrice(value);
    }
  };

  const deleteKey = async () =>
    fetch(`/api/deleteRedisKey?key=${batchId}`, {
      method: 'PUT',
    });

  const handleKeyPress = async (e) => {
    if (e.key === 'Enter') {
      await act(e);
    }
  };

  const handleBlur = async (e) => await act(e);

  const handleChange = (e) =>
    setCloseTradePrices({ ...closeTradePrices, [batchId]: e.target.value });

  return (
    <input
      style={{ width: '65px', textAlign: 'right' }}
      type="number"
      id="closeTradePrice"
      name="closeTradePrice"
      min="0"
      step="0.01"
      placeholder="0.00"
      value={formatValue(closeTradePrices[batchId]) || ''}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyPress={handleKeyPress}
    />
  );
};

export default CloseTradePriceInput;
