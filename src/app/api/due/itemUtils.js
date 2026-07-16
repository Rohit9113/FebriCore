// app/api/due/itemUtils.js
export const validateAndProcessItems = (rawItems) => {
  if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
    return { error: "Kam se kam ek item required hai" };
  }

  const processed = [];

  for (const raw of rawItems) {
    const name = raw.name?.trim();
    if (!name) {
      return { error: "Har item ka naam required hai" };
    }

    const pricingType = raw.pricingType === "contract" ? "contract" : "perKg";
    const pieces       = Math.max(0, Number(raw.pieces) || 1);

    if (pricingType === "contract") {
      const contractAmount = Number(raw.contractAmount) || 0;
      if (contractAmount <= 0) {
        return { error: `"${name}" ke liye contract amount required hai` };
      }
      processed.push({
        name,
        pieces,
        pricingType,
        weightKg:       0,
        ratePerKg:      0,
        contractAmount: Math.round(contractAmount),
        total:          Math.round(contractAmount),
      });
      continue;
    }

    // perKg
    const weightKg  = Number(raw.weightKg)  || 0;
    const ratePerKg = Number(raw.ratePerKg) || 0;

    if (weightKg <= 0) {
      return { error: `"${name}" ka total weight (kg) required hai` };
    }
    if (ratePerKg <= 0) {
      return { error: `"${name}" ka rate/kg required hai` };
    }

    processed.push({
      name,
      pieces,
      pricingType,
      weightKg,
      ratePerKg,
      contractAmount: 0,
      total: Math.round(weightKg * ratePerKg),
    });
  }

  return { items: processed };
};