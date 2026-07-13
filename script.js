const selectedMeals = new Set();

// ==========================
// Load all JSON files
// ==========================

async function loadDatabase() {
  const [meals, ingredients, mealIngredients] = await Promise.all([
    fetch("Meals.json").then((res) => res.json()),
    fetch("Ingredients.json").then((res) => res.json()),
    fetch("MealIngredients.json").then((res) => res.json()),
  ]);

  return createDatabase(meals, ingredients, mealIngredients);
}

// ==========================
// Build database indexes
// ==========================

function createDatabase(meals, ingredients, mealIngredients) {
  // Lookup meals by ID
  const mealMap = new Map(meals.map((meal) => [meal.mealID, meal]));

  // Lookup ingredients by ID
  const ingredientMap = new Map(
    ingredients.map((ingredient) => [ingredient.ingredientID, ingredient]),
  );

  // Lookup all ingredients belonging to each meal
  const mealIngredientMap = new Map();

  for (const mealIngredient of mealIngredients) {
    if (!mealIngredientMap.has(mealIngredient.meal_id)) {
      mealIngredientMap.set(mealIngredient.meal_id, []);
    }

    mealIngredientMap.get(mealIngredient.meal_id).push(mealIngredient);
  }

  // ==========================
  // Helper Functions
  // ==========================

  function getMeal(mealID) {
    const meal = mealMap.get(mealID);

    if (!meal) return null;

    const ingredients = (mealIngredientMap.get(mealID) ?? [])
      .map((mi) => {
        const ingredient = ingredientMap.get(mi.ingredient_id);

        // Skip missing ingredients
        if (!ingredient) {
          console.warn(`Ingredient ${mi.ingredient_id} not found.`);
          return null;
        }

        const calories = (ingredient.caloriesPer100g * mi.grams) / 100;

        return {
          ...ingredient,
          grams: mi.grams,
          calories,
        };
      })
      .filter(Boolean);

    const totalCalories = ingredients.reduce(
      (sum, ingredient) => sum + ingredient.calories,
      0,
    );

    const caloriesPerPerson = totalCalories / (meal.servings || 1);

    return {
      ...meal,
      ingredients,
      totalCalories,
      caloriesPerPerson,
    };
  }

  function getAllMeals() {
    return meals.map((meal) => getMeal(meal.mealID));
  }

  function getIngredient(ingredientID) {
    return ingredientMap.get(ingredientID);
  }

  // Public API
  return {
    meals,
    ingredients,
    mealIngredients,

    getMeal,
    getAllMeals,
    getIngredient,
  };
}

// ==========================
// Example Usage
// ==========================

async function main() {
  const db = await loadDatabase();

  console.log("Meal IDs:", [...db.meals.map((m) => m.mealID)]);
  console.log("Ingredient IDs:", [
    ...db.ingredients.map((i) => i.ingredientID),
  ]);

  // Display one meal
  console.log(db.getMeal(1));

  // Display all meals
  const allMeals = db.getAllMeals();

  console.log(allMeals);

  // Example output
  for (const meal of allMeals) {
    console.log(`\n${meal.mealName}`);
    console.log(`Total Calories: ${meal.totalCalories.toFixed(0)} kcal`);

    for (const ingredient of meal.ingredients) {
      console.log(
        `- ${ingredient.ingredientName}: ${ingredient.grams}g (${ingredient.calories.toFixed(0)} kcal)`,
      );
    }
  }
}

//Render Meals
function renderMeals(db) {
  const container = document.getElementById("mealContainer");

  container.innerHTML = "";

  // Group meals by type
  const groupedMeals = {};

  for (const meal of db.getAllMeals()) {
    const type = meal.mealType || "Other";

    if (!groupedMeals[type]) {
      groupedMeals[type] = [];
    }

    groupedMeals[type].push(meal);
  }

  // Create sections
  // Define display order
  const mealTypeOrder = ["Breakfast", "Lunch", "Dinner", "Snack"];

  const remainingTypes = Object.keys(groupedMeals).filter(
    (type) => !mealTypeOrder.includes(type),
  );

  mealTypeOrder.push(...remainingTypes);

  // Create sections in chosen order
  for (const mealType of mealTypeOrder) {
    if (!groupedMeals[mealType]) {
      continue;
    }

    const section = document.createElement("section");

    section.className = "meal-section";

    const heading = document.createElement("h2");

    heading.textContent = `▼ ${mealType}`;

    heading.className = "meal-section-heading";

    heading.style.cursor = "pointer";

    const grid = document.createElement("div");

    grid.className = "meal-grid";

    for (const meal of groupedMeals[mealType]) {
      grid.appendChild(createMealCard(meal, db));
    }

    section.appendChild(heading);

    section.appendChild(grid);

    // Collapse functionality

    heading.addEventListener("click", () => {
      const isHidden = grid.style.display === "none";

      if (isHidden) {
        grid.style.display = "grid";

        heading.textContent = `▼ ${mealType}`;
      } else {
        grid.style.display = "none";

        heading.textContent = `▶ ${mealType}`;
      }
    });

    container.appendChild(section);
  }
}

//Show/Hide all
document.getElementById("toggleMealsButton").addEventListener("click", () => {
  const button = document.getElementById("toggleMealsButton");

  const grids = document.querySelectorAll(".meal-grid");

  const headings = document.querySelectorAll(".meal-section-heading");

  const currentlyExpanded = [...grids].some(
    (grid) => grid.style.display !== "none",
  );

  if (currentlyExpanded) {
    // Hide all

    grids.forEach((grid) => {
      grid.style.display = "none";
    });

    headings.forEach((heading) => {
      heading.textContent = heading.textContent.replace("▼", "▶");
    });

    button.textContent = "Show All Meals";
  } else {
    // Show all

    grids.forEach((grid) => {
      grid.style.display = "grid";
    });

    headings.forEach((heading) => {
      heading.textContent = heading.textContent.replace("▶", "▼");
    });

    button.textContent = "Hide All Meals";
  }
});

//SHOW HIDE INGREDIENTS
// ==========================
// Show/Hide All Ingredients
// ==========================

document
  .getElementById("toggleIngredientsButton")
  .addEventListener("click", () => {
    const button = document.getElementById("toggleIngredientsButton");

    const ingredientLists = document.querySelectorAll(".ingredient-list");

    const currentlyVisible = [...ingredientLists].some(
      (list) => list.style.display !== "none",
    );

    if (currentlyVisible) {
      ingredientLists.forEach((list) => {
        list.style.display = "none";
      });

      button.textContent = "Show All Ingredients";
    } else {
      ingredientLists.forEach((list) => {
        list.style.display = "block";
      });

      button.textContent = "Hide All Ingredients";
    }
  });

///Search
document.getElementById("mealSearch").addEventListener("input", (event) => {
  const searchTerm = event.target.value.toLowerCase().trim();

  const sections = document.querySelectorAll(".meal-section");

  sections.forEach((section) => {
    const cards = section.querySelectorAll(".meal-card");

    let sectionHasMatch = false;

    cards.forEach((card) => {
      const cardText = card.textContent.toLowerCase();

      if (cardText.includes(searchTerm) || searchTerm === "") {
        card.style.display = "flex";

        sectionHasMatch = true;
      } else {
        card.style.display = "none";
      }
    });

    // Hide category headings with no results
    if (sectionHasMatch) {
      section.style.display = "block";
    } else {
      section.style.display = "none";
    }
  });
});

//create card
function createMealCard(meal, db) {
  const card = document.createElement("div");

  card.className = "meal-card";

  const visibleIngredients = meal.ingredients.slice(0, 3);

  let ingredientList = visibleIngredients
    .map((i) => `<li>${i.ingredientName} (${i.grams}g)</li>`)
    .join("");

  if (meal.ingredients.length > 3) {
    ingredientList += `<li><em>+${meal.ingredients.length - 3} more...</em></li>`;
  }

  card.innerHTML = `

    <div class="meal-header">

        <h3>${meal.mealName}</h3>

        <button class="add-meal-button">
            +
        </button>

    </div>

    <p>
        <strong>
            ${meal.caloriesPerPerson.toFixed(0)} kcal per person
        </strong>
    </p>

    <ul class="ingredient-list" style="display:none;">
        ${ingredientList}
    </ul>

`;

  const button = card.querySelector("button");

  button.addEventListener("click", () => {
    card.classList.toggle("selected");

    if (card.classList.contains("selected")) {
      button.textContent = "x";

      selectedMeals.add(meal.mealID);
    } else {
      button.textContent = "+";

      selectedMeals.delete(meal.mealID);
    }

    updateShoppingList(db);
  });

  return card;
}
//Shopping list generator

function updateShoppingList(db) {
  const shoppingList = document.getElementById("shoppingList");

  const groupedMeals = {};

  for (const mealID of selectedMeals) {
    const meal = db.getMeal(mealID);

    if (!groupedMeals[meal.mealType]) {
      groupedMeals[meal.mealType] = [];
    }

    groupedMeals[meal.mealType].push(meal.mealName);
  }

  let output = "";

  for (const type in groupedMeals) {
    output += `${type}\n`;
    output += "-".repeat(type.length);
    output += "\n";

    for (const meal of groupedMeals[type]) {
      output += `${meal}\n`;
    }

    output += "\n";
  }

  shoppingList.textContent = output;
}

//Copy Button
document.getElementById("copyButton").addEventListener("click", async () => {
  const button = document.getElementById("copyButton");

  const text = document.getElementById("shoppingList").textContent;

  await navigator.clipboard.writeText(text);

  // Change button appearance
  button.innerHTML = `
<svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="copy-icon">

    <path d="M20 6L9 17l-5-5"/>

</svg>`;

  button.classList.add("copied");

  // Reset after 2 seconds
  setTimeout(() => {
    button.innerHTML = `
<svg
    class="copy-icon"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round">

    <rect x="9" y="9" width="13" height="13" rx="2"></rect>

    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>

</svg>`;

    button.classList.remove("copied");
  }, 2000);
});

//Export Button
document.getElementById("exportButton").addEventListener("click", () => {
  const text = document.getElementById("shoppingList").textContent;

  const blob = new Blob([text], { type: "text/plain" });

  const link = document.createElement("a");

  link.href = URL.createObjectURL(blob);

  link.download = "shopping-list.txt";

  link.click();
});

//Clear button
document.getElementById("clearButton").addEventListener("click", () => {
  // Remove all selected meals
  selectedMeals.clear();

  // Reset shopping list display
  document.getElementById("shoppingList").textContent = "No meals selected";

  // Reset all meal cards
  document.querySelectorAll(".meal-card").forEach((card) => {
    card.classList.remove("selected");

    const button = card.querySelector(".add-meal-button");
    button.textContent = "+";
  });
});

///

async function main() {
  const db = await loadDatabase();

  renderMeals(db);
}

main();
