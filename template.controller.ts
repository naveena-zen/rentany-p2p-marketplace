import { Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { createTemplateSchema } from '../validators/template.validator';
import { AuthenticatedRequest } from '../middleware/auth';

export async function createTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const data = createTemplateSchema.parse(req.body);

    const template = await prisma.contractTemplate.create({
      data: {
        ownerId: req.user.userId,
        name: data.name,
        clauses: data.clauses as any,
      },
    });

    return res.status(201).json(template);
  } catch (err) {
    next(err);
  }
}

export async function getOwnerTemplates(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const templates = await prisma.contractTemplate.findMany({
      where: { ownerId: req.user.userId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(templates);
  } catch (err) {
    next(err);
  }
}

export async function getTemplateById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const template = await prisma.contractTemplate.findUnique({
      where: { id },
    });

    if (!template) return res.status(404).json({ error: 'Contract template not found' });

    return res.json(template);
  } catch (err) {
    next(err);
  }
}

export async function updateTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    const existing = await prisma.contractTemplate.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Contract template not found' });
    if (existing.ownerId !== req.user.userId) return res.status(403).json({ error: 'Forbidden' });

    const updated = await prisma.contractTemplate.update({
      where: { id },
      data: {
        ...(req.body.name ? { name: req.body.name } : {}),
        ...(req.body.clauses ? { clauses: req.body.clauses } : {}),
      },
    });

    return res.json(updated);
  } catch (err) {
    next(err);
  }
}
