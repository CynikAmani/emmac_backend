export const generateFriendlyPassword = () => {
  const adjectives = ['Happy', 'Sunny', 'Brave', 'Calm', 'Wise', 'Swift', 'Gentle', 'Bright', 'Cool', 'Fresh'];
  const nouns = ['Tiger', 'Eagle', 'River', 'Mountain', 'Ocean', 'Forest', 'Star', 'Moon', 'Cloud', 'Rain'];
  const randomNumber = Math.floor(Math.random() * 90) + 10; // 10-99
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  
  return `${adjective}${noun}${randomNumber}`;
};