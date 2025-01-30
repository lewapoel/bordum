// src/data/warehouses.js

export const warehouses = {
  Ogrodzenia: [
    { id: 1, name: "Metal Fence", price: 300, quantity: 10, unit: "szt." },
    { id: 2, name: "Wooden Gate", price: 500, quantity: 8, unit: "szt." },
    { id: 3, name: "Garden Railing", price: 250, quantity: 12, unit: "mb" },
    { id: 4, name: "Iron Fence", price: 600, quantity: 6, unit: "mb" },
    { id: 5, name: "PVC Fence", price: 200, quantity: 15, unit: "mb" },
    { id: 6, name: "Steel Gate", price: 700, quantity: 5, unit: "szt." },
    { id: 7, name: "Stone Fence", price: 400, quantity: 9, unit: "mb" },
    { id: 8, name: "Security Gate", price: 800, quantity: 4, unit: "szt." },
    { id: 9, name: "Fence Post", price: 100, quantity: 20, unit: "szt." },
    { id: 10, name: "Chain Link Fence", price: 150, quantity: 18, unit: "mb" },
  ],
  Stal: [
    { id: 11, name: "Steel Pipe", price: 120, quantity: 15, unit: "mb" },
    { id: 12, name: "Metal Rod", price: 90, quantity: 20, unit: "mb" },
    { id: 13, name: "Iron Sheet", price: 180, quantity: 10, unit: "szt." },
    { id: 14, name: "Steel Beam", price: 300, quantity: 7, unit: "mb" },
    { id: 15, name: "Galvanized Steel", price: 250, quantity: 12, unit: "mb" },
    { id: 16, name: "Aluminum Sheet", price: 200, quantity: 18, unit: "szt." },
    { id: 17, name: "Welded Pipe", price: 140, quantity: 14, unit: "mb" },
    { id: 18, name: "Steel Wire", price: 110, quantity: 22, unit: "mb" },
    { id: 19, name: "Metal Mesh", price: 160, quantity: 16, unit: "szt." },
    { id: 20, name: "Steel Frame", price: 270, quantity: 9, unit: "szt." },
  ],
  Beton: [
    { id: 21, name: "Concrete Slab", price: 350, quantity: 12, unit: "szt." },
    { id: 22, name: "Cement Bag", price: 50, quantity: 30, unit: "szt." },
    { id: 23, name: "Concrete Block", price: 70, quantity: 25, unit: "szt." },
    { id: 24, name: "Paving Stone", price: 90, quantity: 20, unit: "szt." },
    { id: 25, name: "Concrete Pipe", price: 220, quantity: 10, unit: "mb" },
    { id: 26, name: "Precast Panel", price: 400, quantity: 8, unit: "szt." },
    { id: 27, name: "Curb Stone", price: 60, quantity: 28, unit: "szt." },
    {
      id: 28,
      name: "Reinforced Concrete",
      price: 500,
      quantity: 6,
      unit: "szt.",
    },
    { id: 29, name: "Concrete Mix", price: 80, quantity: 22, unit: "szt." },
    { id: 30, name: "Concrete Pole", price: 130, quantity: 15, unit: "szt." },
  ],
};

// Flatten so we can easily find details by product ID
export const allProducts = Object.values(warehouses).flat();
