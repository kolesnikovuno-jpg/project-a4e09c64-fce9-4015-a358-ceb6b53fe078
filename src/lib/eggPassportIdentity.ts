export interface EggPassportIdentity {
 projectId: string;
 publicUrl: string | null;
 qrAssetPath: string | null;
}
export function createPassportIdentity(projectId: string): EggPassportIdentity {
 if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) throw new Error("Invalid project ID");
 return {projectId,publicUrl:null,qrAssetPath:null};
}
export function assignPassportUrl(identity: EggPassportIdentity, publicUrl: string): EggPassportIdentity {
 const url = new URL(publicUrl);
 if(url.protocol !== "https:" || url.username || url.password || url.hash || url.search) throw new Error("Expected permanent HTTPS passport URL");
 if(identity.publicUrl && identity.publicUrl !== url.href) throw new Error("Passport URL is immutable");
 return {...identity,publicUrl:url.href,qrAssetPath:`passports/${identity.projectId}/qr.svg`};
}
