// Monta a configuração de um cliente novo gerenciado pelo NEXUS.
// Usado pelo "Novo cliente" do Master e pela aprovação do cadastro público.

export const THEME_COLORS = Object.freeze({
  "green-black": ["#18c96e", "#07140c"],
  "red-black": ["#ff4b55", "#200306"],
  "blue-white": ["#3d9bff", "#10253c"],
  "gold-black": ["#e9bd52", "#211804"]
});

export function slugify(value) {
  return String(value || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function newManagedClientConfig(id, body = {}, extra = {}) {
  return {
    theme: body.theme || "green-black",
    primaryColor: body.primaryColor || "#18c96e",
    secondaryColor: body.secondaryColor || "#07140c",
    odin: true,
    postTimes: [],
    adaptiveTiming: true,
    leads: { total: 0, hot: 0, warm: 0, cold: 0 },
    usage: { openaiPercent: 0 },
    aiMode: id === "ragnar-one" ? "own-key" : "shared",
    aiMonthlyImageLimit: 0,
    aiImagesUsed: 0,
    managedInfrastructure: true,
    onboarding: {
      github: true,
      openai: true,
      instagram: false,
      facebook: true,
      metaApp: true,
      creativeProfile: false,
      supportRequested: false
    },
    setupMode: "managed",
    openaiKeySource: id === "ragnar-one" ? "ragnar-exclusive" : "shared",
    ...extra
  };
}
