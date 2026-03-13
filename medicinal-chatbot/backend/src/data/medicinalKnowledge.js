/**
 * Medicinal information knowledge base.
 * DISCLAIMER: This is for informational purposes only. Always consult a healthcare professional.
 */

export const CONDITIONS = {
  headache: {
    name: "Headache",
    symptoms: ["head pain", "headache", "migraine", "tension"],
    remedies: [
      { name: "Stay hydrated", description: "Dehydration often causes headaches. Drink 2-3 liters of water daily." },
      { name: "Rest in dark room", description: "For migraines, rest in a quiet, dark environment." },
      { name: "Ginger tea", description: "Ginger has anti-inflammatory properties that may reduce headache pain." },
      { name: "Peppermint oil", description: "Apply diluted peppermint oil to temples for tension relief." },
    ],
    avoid: ["excess caffeine", "alcohol", "processed foods", "bright screens"],
  },
  cough: {
    name: "Cough",
    symptoms: ["cough", "dry cough", "wet cough", "throat irritation"],
    remedies: [
      { name: "Honey", description: "1-2 tsp honey can soothe throat and reduce cough frequency." },
      { name: "Turmeric milk", description: "Turmeric has antimicrobial properties. Add to warm milk." },
      { name: "Steam inhalation", description: "Inhale steam to loosen mucus and soothe airways." },
      { name: "Tulsi (Holy Basil)", description: "Boil tulsi leaves in water, drink the decoction." },
    ],
    avoid: ["cold drinks", "dairy if mucus-heavy", "smoking", "dust"],
  },
  indigestion: {
    name: "Indigestion",
    symptoms: ["indigestion", "bloating", "acid reflux", "heartburn", "stomach upset"],
    remedies: [
      { name: "Fennel seeds", description: "Chew fennel seeds after meals to aid digestion." },
      { name: "Ginger", description: "Ginger tea or raw ginger stimulates digestion." },
      { name: "Peppermint", description: "Peppermint tea can relieve bloating and gas." },
      { name: "Smaller meals", description: "Eat smaller, more frequent meals instead of large ones." },
    ],
    avoid: ["spicy foods", "fried foods", "eating late at night", "carbonated drinks"],
  },
  cold: {
    name: "Common Cold",
    symptoms: ["cold", "runny nose", "congestion", "sneezing", "sore throat"],
    remedies: [
      { name: "Vitamin C", description: "Citrus fruits, amla (Indian gooseberry) boost immunity." },
      { name: "Warm fluids", description: "Soup, herbal tea, warm water with honey keep you hydrated." },
      { name: "Rest", description: "Adequate sleep helps your body fight the virus." },
      { name: "Garlic", description: "Garlic has antimicrobial properties; add to meals." },
    ],
    avoid: ["dairy (can thicken mucus)", "sugar", "stress", "skipping sleep"],
  },
  fever: {
    name: "Fever",
    symptoms: ["fever", "high temperature", "body ache"],
    remedies: [
      { name: "Stay hydrated", description: "Water, ORS, coconut water to prevent dehydration." },
      { name: "Rest", description: "Allow your body to recover; avoid physical exertion." },
      { name: "Cool compress", description: "Apply cool cloth to forehead and wrists." },
      { name: "Basil (Tulsi) tea", description: "Tulsi has antipyretic properties; helps reduce fever." },
    ],
    avoid: ["heavy meals", "alcohol", "caffeine", "bundle up too much"],
  },
  insomnia: {
    name: "Insomnia / Sleep Issues",
    symptoms: ["insomnia", "sleeplessness", "can't sleep", "trouble sleeping"],
    remedies: [
      { name: "Chamomile tea", description: "Drink before bed for its calming effect." },
      { name: "Warm milk", description: "Contains tryptophan; may promote sleep." },
      { name: "Sleep hygiene", description: "Fixed bedtime, no screens 1 hour before, dark room." },
      { name: "Ashwagandha", description: "Adaptogen that may help with stress-related sleeplessness." },
    ],
    avoid: ["caffeine after noon", "heavy meals at night", "screens before bed"],
  },
  skin: {
    name: "Skin Issues",
    symptoms: ["skin", "acne", "rashes", "itching", "dry skin"],
    remedies: [
      { name: "Aloe vera", description: "Apply fresh aloe gel for soothing and hydration." },
      { name: "Turmeric paste", description: "Anti-inflammatory; apply with honey for acne." },
      { name: "Neem", description: "Antimicrobial; neem leaf paste or oil for various skin issues." },
      { name: "Stay hydrated", description: "Water improves skin elasticity and glow." },
    ],
    avoid: ["excess sugar", "processed foods", "harsh chemicals", "stress"],
  },
  anxiety: {
    name: "Anxiety / Stress",
    symptoms: ["anxiety", "stress", "nervousness", "panic"],
    remedies: [
      { name: "Brahmi (Bacopa)", description: "Traditional nervine tonic; supports calm and focus." },
      { name: "Deep breathing", description: "4-7-8 or box breathing can reduce acute anxiety." },
      { name: "Ashwagandha", description: "Adaptogen that may lower cortisol and stress." },
      { name: "Lavender", description: "Lavender tea or oil aromatherapy for relaxation." },
    ],
    avoid: ["excess caffeine", "alcohol", "sleep deprivation"],
  },
  joint_pain: {
    name: "Joint Pain",
    symptoms: ["joint pain", "arthritis", "joint stiffness", "knee pain"],
    remedies: [
      { name: "Turmeric + Black pepper", description: "Curcumin with piperine has anti-inflammatory effects." },
      { name: "Epsom salt bath", description: "Magnesium may help relax muscles and reduce pain." },
      { name: "Gentle exercise", description: "Walking, swimming maintain joint mobility." },
      { name: "Ginger", description: "Anti-inflammatory; add to diet or as supplement." },
    ],
    avoid: ["inactivity", "excess weight", "processed foods", "inflammation-triggering foods"],
  },
  diabetes: {
    name: "Blood Sugar / Diabetes",
    symptoms: ["diabetes", "blood sugar", "high sugar"],
    remedies: [
      { name: "Fenugreek seeds", description: "Soak overnight, drink water + chew seeds; may help glucose control." },
      { name: "Bitter gourd", description: "Contains compounds that may support blood sugar management." },
      { name: "Cinnamon", description: "May improve insulin sensitivity; add to food in moderation." },
      { name: "Regular exercise", description: "Physical activity helps glucose uptake by cells." },
    ],
    avoid: ["refined sugar", "white flour", "sedentary lifestyle"],
    caution: "Always coordinate with your doctor when managing diabetes.",
  },
  general: {
    name: "General Wellness",
    symptoms: ["general", "wellness", "immunity", "health"],
    remedies: [
      { name: "Balanced diet", description: "Fruits, vegetables, whole grains, lean protein." },
      { name: "Adequate sleep", description: "7-8 hours supports immune function and recovery." },
      { name: "Regular exercise", description: "30 min moderate activity most days." },
      { name: "Stress management", description: "Meditation, yoga, or hobbies that relax you." },
    ],
    avoid: ["smoking", "excess alcohol", "processed foods", "chronic stress"],
  },
};

export const ALLERGY_CAUTIONS = {
  honey: "Avoid if allergic to bee products.",
  ginger: "Use cautiously if on blood thinners.",
  turmeric: "Avoid in excess if you have gallbladder issues or on blood thinners.",
  garlic: "Can interact with blood thinners.",
  tulsi: "Generally safe; avoid in excess during pregnancy.",
};
