export async function onRequestPost(context: any) {
  const { request, env } = context;
  
  const GEMINI_API_KEY = env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ ids: [], error: "AI service not configured" }), {
      status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  try {
    const { query, items } = await request.json();

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ ids: [] }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const artifactList = items.map((i: any) => ({
      id: i.id,
      name: i.name || "",
      category: i.category || "",
      material: i.material || "",
      description: (i.description || "").substring(0, 100),
      condition: i.condition || "",
      location: i.currentLocation || "",
      status: i.status || ""
    }));
    
    const prompt = `You are a heritage artifact search assistant for a palace museum inventory system.

Search query: "${query}"

Available artifacts:
${JSON.stringify(artifactList, null, 2)}

Find all artifacts that match the search query based on name, category, material, description, condition, location, or status.
Be generous in matching — if the query mentions "fair" find items with "Fair" condition, if it mentions "weapon" find "Weaponry & Armor", etc.

Return ONLY a valid JSON array of matching artifact IDs. Nothing else. No explanation.
Example response: ["ART-12345678", "ART-87654321"]
If nothing matches: []`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 }
      })
    });

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    const clean = text.replace(/```json|```/g, "").trim();
    
    let ids = [];
    try {
      ids = JSON.parse(clean);
      if (!Array.isArray(ids)) ids = [];
    } catch {
      ids = [];
    }

    return new Response(JSON.stringify({ ids }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ids: [], error: err.message }), {
      status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
