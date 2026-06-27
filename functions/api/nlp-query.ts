export async function onRequestPost(context: any) {
  const { request, env } = context;
  
  const GEMINI_API_KEY = env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: "AI service not configured" }), {
      status: 503, headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const { query, items } = await request.json();
    
    const prompt = `You are a heritage artifact search assistant. Given this search query: "${query}"
    
Return a JSON array of artifact IDs that match. Only return IDs from this list.
Artifacts: ${JSON.stringify(items.map((i: any) => ({ id: i.id, name: i.name, category: i.category, material: i.material, description: i.description, condition: i.condition, currentLocation: i.currentLocation })))}

Respond with ONLY a valid JSON array of matching IDs like: ["ART-001", "ART-002"]
If nothing matches, return: []`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    const clean = text.replace(/```json|```/g, "").trim();
    const ids = JSON.parse(clean);

    return new Response(JSON.stringify({ ids }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ids: [], error: err.message }), {
      status: 200, headers: { "Content-Type": "application/json" }
    });
  }
}
