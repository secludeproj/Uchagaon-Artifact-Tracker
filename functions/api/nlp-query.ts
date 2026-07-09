export async function onRequestPost(context: any) {
  const { request, env } = context;
  
  const GEMINI_API_KEY = env.GEMINI_API_KEY;

  try {
    const { query, items } = await request.json();

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ ids: [] }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // Always do local search first as baseline
    const q = query.toLowerCase();
    const words = q.split(/\s+/).filter((w: string) => w.length > 1);
    
    const localMatches = items.filter((i: any) => {
      const searchText = [
        i.name || "",
        i.category || "",
        i.material || "",
        i.description || "",
        i.condition || "",
        i.currentLocation || "",
        i.originalLocation || "",
        i.status || "",
        i.story || "",
        i.estimatedAge || "",
      ].join(" ").toLowerCase();
      
      return words.some((word: string) => searchText.includes(word));
    }).map((i: any) => i.id);

    // If no Gemini key, return local results
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ ids: localMatches }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // Try Gemini for enhanced semantic search
    try {
      const artifactList = items.map((i: any) => ({
        id: i.id,
        name: i.name || "",
        category: i.category || "",
        material: i.material || "",
        description: (i.description || "").substring(0, 150),
        condition: i.condition || "",
        location: i.currentLocation || "",
        status: i.status || "",
        age: i.estimatedAge || ""
      }));

      const prompt = `Heritage artifact search. Query: "${query}"

Artifacts:
${artifactList.map((a: any) => `${a.id}: ${a.name} | ${a.category} | ${a.material} | ${a.condition} | ${a.location} | ${a.description.substring(0, 80)}`).join("\n")}

Return JSON array of IDs that semantically match the query. Be generous - match partial words, synonyms, related concepts.
For "art" match paintings, artwork, manuscripts. For "weapon" match swords, armor. For "fair" match Fair condition items.
Return ONLY the JSON array, nothing else. Example: ["ART-123", "ART-456"]
If nothing matches semantically, return: []`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 500 }
        })
      });

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
      const clean = text.replace(/```json|```/g, "").trim();
      
      let geminiIds: string[] = [];
      try {
        const parsed = JSON.parse(clean);
        if (Array.isArray(parsed)) geminiIds = parsed;
      } catch { geminiIds = []; }

      // Merge Gemini results with local results, deduplicated
      const allIds = [...new Set([...geminiIds, ...localMatches])];
      
      return new Response(JSON.stringify({ ids: allIds }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });

    } catch (geminiErr) {
      // Gemini failed — return local results
      return new Response(JSON.stringify({ ids: localMatches }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

  } catch (err: any) {
    return new Response(JSON.stringify({ ids: [], error: err.message }), {
      status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
