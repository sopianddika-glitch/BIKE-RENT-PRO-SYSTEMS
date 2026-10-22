export const SWITCH_REASONS = ['Kerusakan', 'Masalah Teknis', 'Permintaan Customer', 'Upgrade/Downgrade', 'Operasional', 'Lainnya'];

export const OLD_UNIT_STATUSES = [
  { id: 'bengkel', label: 'Dalam Perbaikan' },
  { id: 'tersedia', label: 'Siap Disewa' },
];

export const getReplacementBikes = (bikes, transactions, currentBikeId) => bikes.filter((bike) => (
  bike.id !== Number(currentBikeId)
  && bike.status === 'tersedia'
  && !transactions.some((transaction) => transaction.category === 'rental' && !transaction.returnedAt && Number(transaction.bikeId) === bike.id)
));

// Keep the financial transaction intact. Only its current unit and unit history change.
export const switchRentalUnit = (state, request, switchedAt = new Date().toISOString()) => {
  const { rentalId, currentBikeId, replacementBikeId, oldBikeStatus, reason, note = '', expectedSwitchCount } = request;
  const transaction = state.transactions.find((item) => item.id === Number(rentalId));
  if (!transaction || transaction.category !== 'rental') throw new Error('Rental tidak ditemukan.');
  if (transaction.returnedAt) throw new Error('Rental sudah selesai. Unit tidak dapat diganti.');
  const history = Array.isArray(transaction.switchHistory) ? transaction.switchHistory : [];
  if (Number(transaction.bikeId) !== Number(currentBikeId) || history.length !== expectedSwitchCount) {
    throw new Error('Unit aktif rental sudah berubah. Tutup dialog dan buka kembali Ganti Unit.');
  }
  const oldBike = state.bikes.find((bike) => bike.id === Number(currentBikeId));
  if (!oldBike || oldBike.status !== 'disewa') throw new Error('Rental tidak lagi memiliki unit aktif.');
  if (Number(currentBikeId) === Number(replacementBikeId)) throw new Error('Unit pengganti harus berbeda dari unit saat ini.');
  const newBike = state.bikes.find((bike) => bike.id === Number(replacementBikeId));
  if (!newBike) throw new Error('Unit pengganti tidak ditemukan.');
  if (!getReplacementBikes(state.bikes, state.transactions, oldBike.id).some((bike) => bike.id === newBike.id)) {
    throw new Error('Unit ini sudah tidak tersedia. Pilih unit lain.');
  }
  if (state.transactions.some((item) => item.id !== transaction.id && item.category === 'rental' && !item.returnedAt && Number(item.bikeId) === oldBike.id)) {
    throw new Error('Data unit aktif tidak konsisten. Periksa rental sebelum melanjutkan.');
  }
  if (!OLD_UNIT_STATUSES.some((status) => status.id === oldBikeStatus) || !SWITCH_REASONS.includes(reason)
    || typeof note !== 'string' || note.length > 1000 || (reason === 'Lainnya' && !note.trim())
    || !Number.isFinite(Date.parse(switchedAt))) throw new Error('Alasan, kondisi unit lama, atau catatan tidak valid.');

  const event = {
    id: `${transaction.id}-${history.length + 1}-${switchedAt}`,
    rentalId: transaction.id,
    fromBikeId: oldBike.id,
    fromBikeNumber: oldBike.number,
    fromBikeType: oldBike.type,
    toBikeId: newBike.id,
    toBikeNumber: newBike.number,
    toBikeType: newBike.type,
    switchedAt,
    reason,
    note: note.trim(),
    oldBikeStatus,
  };
  return {
    ...state,
    bikes: state.bikes.map((bike) => bike.id === oldBike.id ? { ...bike, status: oldBikeStatus }
      : bike.id === newBike.id ? { ...bike, status: 'disewa' } : bike),
    transactions: state.transactions.map((item) => item.id === transaction.id ? {
      ...item,
      originalBikeId: item.originalBikeId ?? oldBike.id,
      originalBikeNumber: item.originalBikeNumber ?? oldBike.number,
      bikeId: newBike.id,
      bikeNumber: newBike.number,
      switchHistory: [...history, event],
    } : item),
  };
};

export const getSwitchActivities = (transactions) => transactions.flatMap((transaction) => (
  (transaction.switchHistory || []).map((event) => {
    const date = new Date(event.switchedAt);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return {
      id: `switch-${event.id}`,
      date: Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : transaction.date,
      timestamp: event.switchedAt,
      activityType: 'switch',
      category: 'rental',
      rentalCode: transaction.rentalCode || `#${transaction.id}`,
      note: `Unit rental diganti: ${event.fromBikeNumber} → ${event.toBikeNumber} / ${event.reason}`,
    };
  })
));
