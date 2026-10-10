export const GLOBAL_PLAY_REFERENCE_VERSION = "globalplay-chat-reference-v1";

export function globalPlayCarouselPlan(){
  return [
    {role:"cinema",message:"Seu momento de cinema",overlay:"SEU MOMENTO DE CINEMA",scene:"Family seen from behind on a sofa, sharing popcorn, watching a large television filled by an original cinematic dinosaur adventure. Warm amber living-room lighting contrasts with the cool dramatic television scene."},
    {role:"catalog",message:"Filmes e séries para escolher",overlay:"FILMES E SÉRIES",scene:"Close view of a large television showing a clean streaming catalogue with two orderly rows of original film and series artwork; popcorn bowl and remote in the foreground, warm amber room lighting."},
    {role:"children",message:"Diversão para toda a família",overlay:"DIVERSÃO EM FAMÍLIA",scene:"Family watching a colorful original animated musical adventure on a large television; a child points with delight, popcorn on the sofa, warm welcoming living-room lighting."},
    {role:"football",message:"Torça junto a cada lance",overlay:"TORÇA JUNTO",scene:"Family cheering from their sofa at a generic football match filling a large television, with an attacking player approaching the goal; warm amber room lighting, joyful raised arms, no real team insignia."}
  ];
}

export function globalPlayReferenceDirection(format,index=0){
  if(format==="carousel"){
    const card=globalPlayCarouselPlan()[Math.max(0,Math.min(3,Number(index)||0))];
    return "Approved chat reference direction ("+GLOBAL_PLAY_REFERENCE_VERSION+"): generate only ONE separate carousel card, never the four-panel reference montage. "+card.scene+" Keep a consistent home, family and amber color palette across all four cards. Use the complete scene without a copy panel or added footer; reserve a single brand placement in the upper right.";
  }
  if(format==="reel")return "Approved chat reference direction ("+GLOBAL_PLAY_REFERENCE_VERSION+"): family seen from behind sharing popcorn on a sofa; large television filled with an original cinematic dinosaur adventure; cozy amber living room against cool blue television lighting. Use one scene suitable for a vertical Reel, reserve the lower portion for a readable dark copy panel and upper right for one brand placement. Do not copy the 1/4 counter or repeated logos from the reference.";
  return "";
}
