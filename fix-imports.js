const fs = require('fs');
const path = require('path');

function processDir(dir) {
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      if (!full.includes('node_modules') && !full.includes('.next')) {
        processDir(full);
      }
    } else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
      let content = fs.readFileSync(full, 'utf8');
      
      const hasTenantAction = content.includes('await import("@/app/actions/tenant")');
      const hasWhatsappLib = content.includes('await import("@/lib/whatsapp")');
      
      if (hasTenantAction || hasWhatsappLib) {
        // Remove dynamic imports
        content = content.replace(/const\s+\{\s*getCurrentTenant\s*\}\s*=\s*await\s+import\(['"]@\/app\/actions\/tenant['"]\);/g, '');
        content = content.replace(/const\s+\{\s*clearImpersonation\s*\}\s*=\s*await\s+import\(['"]@\/app\/actions\/tenant['"]\);/g, '');
        content = content.replace(/const\s+\{\s*enqueueWhatsAppMessage\s*\}\s*=\s*await\s+import\(['"]@\/lib\/whatsapp['"]\);/g, '');
        
        // Add static imports at the top (after the first import)
        if (hasTenantAction) {
           let importsToAdd = [];
           if (content.includes('getCurrentTenant')) importsToAdd.push('getCurrentTenant');
           if (content.includes('clearImpersonation')) importsToAdd.push('clearImpersonation');
           
           if (importsToAdd.length > 0 && !content.includes('import { getCurrentTenant } from "@/app/actions/tenant"')) {
               content = content.replace(/import \{.*?\} from .*?;?(\r?\n)/m, (match, p1) => {
                   return match + `import { ${importsToAdd.join(', ')} } from "@/app/actions/tenant";` + p1;
               });
           }
        }
        
        if (hasWhatsappLib) {
           if (!content.includes('import { enqueueWhatsAppMessage }') && content.includes('enqueueWhatsAppMessage')) {
               content = content.replace(/import \{.*?\} from .*?;?(\r?\n)/m, (match, p1) => {
                   return match + 'import { enqueueWhatsAppMessage } from "@/lib/whatsapp";' + p1;
               });
           }
        }

        fs.writeFileSync(full, content, 'utf8');
        console.log('Fixed:', full);
      }
    }
  }
}

processDir('.');
