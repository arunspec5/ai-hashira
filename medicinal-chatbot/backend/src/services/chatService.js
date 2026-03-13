import { CONDITIONS, ALLERGY_CAUTIONS } from "../data/medicinalKnowledge.js";

/**
 * Finds matching medicinal information based on user input.
 */
function findMatchingCondition(userMessage) {
  const message = userMessage.toLowerCase().trim();

  for (const [key, condition] of Object.entries(CONDITIONS)) {
    const matches = condition.symptoms.some((symptom) => message.includes(symptom.toLowerCase()));
    if (matches) return { key, condition };
  }

  return null;
}

/**
 * Gets allergy-related cautions for given remedies.
 */
function getCautionsForRemedies(remedies, userAllergies = []) {
  const cautions = [];
  const allergyLower = (userAllergies || []).map((a) => a.toLowerCase());

  for (const remedy of remedies) {
    const name = remedy.name.toLowerCase();
    for (const [ingredient, caution] of Object.entries(ALLERGY_CAUTIONS)) {
      if (name.includes(ingredient.toLowerCase())) {
        cautions.push({ remedy: remedy.name, caution });
      }
    }
    // Check if user mentioned allergies that might relate
    if (allergyLower.some((a) => name.includes(a))) {
      cautions.push({ remedy: remedy.name, caution: "You mentioned an allergy. Please verify before use." });
    }
  }

  return cautions;
}

/**
 * Processes chat message and returns bot response.
 */
export function processChatMessage(message, userContext = {}) {
  const { name, age, gender, conditions = [], allergies = [] } = userContext;

  if (!message || typeof message !== "string") {
    return {
      text: "Please share what you'd like to know about—symptoms, condition, or wellness tips.",
      type: "bot",
    };
  }

  const match = findMatchingCondition(message);

  if (match) {
    const { condition } = match;
    let text = `**${condition.name}**\n\n`;

    if (name) text += `Hi ${name}, `;
    text += `here's some general information:\n\n`;

    text += "**Suggestions:**\n";
    condition.remedies.forEach((r, i) => {
      text += `${i + 1}. **${r.name}** – ${r.description}\n`;
    });

    if (condition.avoid && condition.avoid.length > 0) {
      text += "\n**Things to avoid:** " + condition.avoid.join(", ") + "\n";
    }

    if (condition.caution) {
      text += `\n⚠️ ${condition.caution}\n`;
    }

    const cautions = getCautionsForRemedies(condition.remedies, allergies);
    if (cautions.length > 0 && allergies.length > 0) {
      text += "\n**Cautions based on your profile:**\n";
      cautions.forEach((c) => {
        text += `• ${c.remedy}: ${c.caution}\n`;
      });
    }

    text += "\n_This is informational only. Always consult a healthcare professional._";

    return { text, type: "bot" };
  }

  return {
    text: "I can help with: headaches, cough, cold, fever, indigestion, sleep issues, skin problems, anxiety, joint pain, blood sugar, and general wellness. What would you like to know more about?",
    type: "bot",
  };
}
