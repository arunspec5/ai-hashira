import { useState } from "react";

const COMMON_CONDITIONS = [
  "Diabetes",
  "Hypertension",
  "Asthma",
  "Thyroid",
  "Heart condition",
  "Kidney issue",
  "Liver issue",
  "None",
];

const COMMON_ALLERGIES = [
  "Penicillin",
  "Sulfa drugs",
  "Pollen",
  "Dust",
  "Latex",
  "Nuts",
  "Shellfish",
  "None",
];

export function UserDetailsForm({ onSubmit, initialValues }) {
  const [name, setName] = useState(initialValues?.name || "");
  const [age, setAge] = useState(initialValues?.age || "");
  const [gender, setGender] = useState(initialValues?.gender || "");
  const [conditions, setConditions] = useState(initialValues?.conditions || []);
  const [allergies, setAllergies] = useState(initialValues?.allergies || []);
  const [customCondition, setCustomCondition] = useState("");
  const [customAllergy, setCustomAllergy] = useState("");

  const toggleItem = (list, setList, item) => {
    if (item === "None") {
      setList((prev) => (prev.includes("None") ? [] : ["None"]));
      return;
    }
    setList((prev) => {
      const withoutNone = prev.filter((x) => x !== "None");
      return withoutNone.includes(item)
        ? withoutNone.filter((x) => x !== item)
        : [...withoutNone, item];
    });
  };

  const addCustom = (value, setValue, list, setList) => {
    if (!value.trim()) return;
    setList((prev) => [...prev.filter((x) => x !== "None"), value.trim()]);
    setValue("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      age: age.trim(),
      gender: gender.trim(),
      conditions: conditions.filter((c) => c !== "None"),
      allergies: allergies.filter((a) => a !== "None"),
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
        <h2 className="text-white font-semibold text-lg">Tell us about yourself</h2>
        <p className="text-emerald-100 text-sm mt-0.5">
          Your details help us tailor medicinal information safely.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Age</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="e.g. 35"
              min="1"
              max="120"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white"
              required
            >
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Existing conditions (if any)
          </label>
          <div className="flex flex-wrap gap-2">
            {COMMON_CONDITIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleItem(conditions, setConditions, c)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  conditions.includes(c)
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={customCondition}
              onChange={(e) => setCustomCondition(e.target.value)}
              placeholder="Add other"
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
            <button
              type="button"
              onClick={() => addCustom(customCondition, setCustomCondition, conditions, setConditions)}
              className="px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200"
            >
              Add
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Allergies (if any)</label>
          <div className="flex flex-wrap gap-2">
            {COMMON_ALLERGIES.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => toggleItem(allergies, setAllergies, a)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  allergies.includes(a) ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={customAllergy}
              onChange={(e) => setCustomAllergy(e.target.value)}
              placeholder="Add other"
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
            <button
              type="button"
              onClick={() => addCustom(customAllergy, setCustomAllergy, allergies, setAllergies)}
              className="px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200"
            >
              Add
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition shadow-md hover:shadow-lg"
        >
          Continue to Chat
        </button>
      </form>
    </div>
  );
}
