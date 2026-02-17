import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { getConfig, getWorkspacePath } from '../config/index.js';
import { logger } from '../utils/logger.js';
import type { SkillManifest } from '../types.js';

/**
 * Skill Loader — discovers and loads skills from workspace and bundled directories.
 * Skills follow the SKILL.md standard (Agent Zero pattern).
 */
export class SkillLoader {
    private loadedSkills: Map<string, SkillManifest> = new Map();

    /**
     * Discover and load all skills
     */
    loadAll(): SkillManifest[] {
        const config = getConfig();
        if (!config.skills.enabled) return [];

        this.loadedSkills.clear();
        const dirs: string[] = [];

        // 1. Bundled skills (shipped with Sumat)
        const bundledDir = path.resolve(import.meta.dirname || __dirname, '../../skills');
        if (fs.existsSync(bundledDir)) {
            dirs.push(bundledDir);
        }

        // 2. Workspace skills
        const wsSkillsDir = path.join(getWorkspacePath(), 'skills');
        if (fs.existsSync(wsSkillsDir)) {
            dirs.push(wsSkillsDir);
        }

        // 3. Extra configured directories
        for (const dir of config.skills.directories) {
            const resolved = path.resolve(dir);
            if (fs.existsSync(resolved)) {
                dirs.push(resolved);
            }
        }

        // Scan each directory
        for (const dir of dirs) {
            this.scanDirectory(dir);
        }

        const skills = Array.from(this.loadedSkills.values());
        logger.info(`Loaded ${skills.length} skills from ${dirs.length} directories`);
        return skills;
    }

    /**
     * Get a specific loaded skill
     */
    getSkill(name: string): SkillManifest | undefined {
        return this.loadedSkills.get(name);
    }

    /**
     * Get all loaded skills
     */
    getAll(): SkillManifest[] {
        return Array.from(this.loadedSkills.values());
    }

    /**
     * Scan a directory for SKILL.md files
     */
    private scanDirectory(baseDir: string): void {
        try {
            const entries = fs.readdirSync(baseDir, { withFileTypes: true });

            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const skillFile = path.join(baseDir, entry.name, 'SKILL.md');
                    if (fs.existsSync(skillFile)) {
                        this.loadSkill(skillFile);
                    }
                } else if (entry.name === 'SKILL.md') {
                    // SKILL.md in the base directory
                    this.loadSkill(path.join(baseDir, entry.name));
                }
            }
        } catch (err: any) {
            logger.warn(`Error scanning skill directory: ${baseDir}`, { error: err.message });
        }
    }

    /**
     * Load a single SKILL.md file
     */
    private loadSkill(filePath: string): void {
        try {
            const raw = fs.readFileSync(filePath, 'utf-8');
            const parsed = matter(raw);

            const manifest: SkillManifest = {
                name: parsed.data.name || path.basename(path.dirname(filePath)),
                description: parsed.data.description || '',
                version: parsed.data.version,
                author: parsed.data.author,
                tools: parsed.data.tools,
                dependencies: parsed.data.dependencies,
                instructions: parsed.content,
                path: path.dirname(filePath),
            };

            this.loadedSkills.set(manifest.name, manifest);
            logger.debug(`Skill loaded: ${manifest.name}`, { path: filePath });
        } catch (err: any) {
            logger.warn(`Error loading skill: ${filePath}`, { error: err.message });
        }
    }
}

// Singleton
let skillLoaderInstance: SkillLoader | null = null;

export function getSkillLoader(): SkillLoader {
    if (!skillLoaderInstance) {
        skillLoaderInstance = new SkillLoader();
    }
    return skillLoaderInstance;
}
