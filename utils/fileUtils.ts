
/**
 * Generates a consistent filename string for exports.
 * Format: GMT_[ProjectName]_v[Version]_[Suffix].[Ext]
 * 
 * @param projectName Name of the project (e.g., "MyFractal")
 * @param version Version number
 * @param suffix Optional suffix (e.g., resolution "1920x1080" or formula name)
 * @param extension File extension without dot (e.g., "png", "json")
 */
export const getExportFileName = (
    projectName: string,
    version: number,
    extension: string,
    suffix?: string
): string => {
    // Sanitize name: remove non-alphanumeric chars except dashes/underscores/spaces
    // Replace spaces with underscores for file safety
    const safeName = projectName.replace(/[^a-zA-Z0-9 \-_]/g, '').trim().replace(/\s+/g, '_') || 'Untitled';
    
    // Format version 0-99 (v05, v12) or v1
    const verStr = `v${version}`;
    
    const parts = ['GMT', safeName, verStr];
    if (suffix) parts.push(suffix);
    
    return `${parts.join('_')}.${extension}`;
};
