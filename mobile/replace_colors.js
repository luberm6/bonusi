const fs = require('fs');
const file = 'src/modules/client/home/ClientHomeScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace root backgrounds
content = content.replace(/backgroundColor:\s*"#E9EDF5"/g, 'backgroundColor: mobileTokens.color.background');

// Replace bright glass colors
content = content.replace(/backgroundColor:\s*"rgba\(255,255,255,0\.[0-9]+\)"/g, 'backgroundColor: mobileTokens.color.glass');
content = content.replace(/borderColor:\s*"rgba\(255,255,255,0\.[0-9]+\)"/g, 'borderColor: mobileTokens.color.borderSoft');

// Specific Bentley Orange -> Gold
content = content.replace(/color:\s*"#FF6B1A"/g, 'color: mobileTokens.color.primaryAlt');
content = content.replace(/color:\s*"#F97316"/g, 'color: mobileTokens.color.primaryAlt');

// Fix text colors in skeleton
content = content.replace(/backgroundColor:\s*"rgba\(255,255,255,0.24\)"/g, 'backgroundColor: "rgba(0, 229, 255, 0.15)"');

// Fix brand mark "CRS"
content = content.replace(/color: "#FF6B1A"/g, 'color: mobileTokens.color.primaryAlt');

// Save it back
fs.writeFileSync(file, content);
console.log("Replaced colors successfully");
