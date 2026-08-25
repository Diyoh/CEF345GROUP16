import React, { useState, useEffect } from 'react';
import { UserRole } from '../../types';
import { api } from '../../api';
import { useI18n } from '../../i18n';
import { entityName } from '../../utils/entities';
import { Card, Button, Select, Table, THead, TBody, TH, TR, TD, TableEmpty, Badge, useToast } from '../ui';

/**
 * Access code generator. Spec: docs/design/03-components.md section 18.
 *
 * The reveal panel is the addition. The code is the product of this screen, and it
 * previously appeared only as another table row, which is the one place a value that has
 * to be transcribed and sent to someone should not live.
 *
 * The code renders in a monospace face because access codes get read aloud over the
 * phone, and telling 0 from O is a correctness requirement rather than a style choice.
 */

export const AccessCodeManager = ({ accessCodes = [], onGenerate }) => {
  const { t, locale } = useI18n();
  const [selectedRole, setSelectedRole] = useState(UserRole.CONTRACTOR);
  const [selectedEntity, setSelectedEntity] = useState('');
  const [latest, setLatest] = useState(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const toast = useToast();

  const ROLE_LABELS = {
    [UserRole.ADMIN]: t('codes.rolePlatform'),
    [UserRole.ENTITY_ADMIN]: t('codes.roleEntity'),
    [UserRole.CONTRACTOR]: t('codes.roleContractor'),
    [UserRole.DEVELOPER_ADMIN]: t('codes.roleDeveloper'),
  };

  // The hierarchy feeds the institution picker: an ENTITY_ADMIN code is bound
  // to one ministry or council, and the binding travels inside the code.
  const [tree, setTree] = useState(null);
  useEffect(() => {
    let cancelled = false;
    api.getEntities()
      .then((res) => !cancelled && res.success && setTree(res.data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const needsEntity = selectedRole === UserRole.ENTITY_ADMIN;

  const handleGenerate = async () => {
    setGenerating(true);
    setCopied(false);
    const result = await onGenerate(selectedRole, needsEntity ? selectedEntity : null);
    setGenerating(false);

    const code = result?.code || null;
    if (typeof code === 'string') {
      setLatest({ code, role: selectedRole, entityId: result.entityId || null });
    }
  };

  const entityLabel = (id) => {
    if (!tree || !id) return '';
    const all = [
      ...tree.ministries,
      ...tree.regions.flatMap((r) => r.councils),
    ];
    const hit = all.find((e) => e.id === id);
    return hit ? entityName(hit, locale) : '';
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(latest.code);
      setCopied(true);
      toast.success(t('codes.copiedToast'));
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      toast.error(t('codes.copyFailed'));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card padding="lg">
        <h2 className="text-h3 text-fg">{t('codes.title')}</h2>
        <p className="mt-1 max-w-prose text-caption text-fg-tertiary">{t('codes.lead')}</p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <Select
            label={t('codes.role')}
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            fieldClassName="w-full sm:w-64"
          >
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>

          {needsEntity && tree && (
            <Select
              label={t('codes.institution')}
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              fieldClassName="w-full sm:w-80"
            >
              <option value="">{t('codes.selectInstitution')}</option>
              <optgroup label={t('gov.ministriesTitle')}>
                {tree.ministries.map((m) => (
                  <option key={m.id} value={m.id}>
                    {entityName(m, locale)}
                  </option>
                ))}
              </optgroup>
              {tree.regions.map((r) => (
                <optgroup key={r.code} label={entityName(r, locale)}>
                  {r.councils.map((c) => (
                    <option key={c.id} value={c.id}>
                      {entityName(c, locale)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          )}

          <Button
            variant="primary"
            size="md"
            onClick={handleGenerate}
            loading={generating}
            disabled={needsEntity && !selectedEntity}
            leadingIcon={<i className="fas fa-key" aria-hidden="true" />}
          >
            {t('codes.generate')}
          </Button>
        </div>

        {/* Reveal panel. Announced politely so the code is not a purely visual result. */}
        {latest && (
          <Card variant="inset" padding="lg" className="mt-6 animate-fade-in">
            <div role="status" aria-live="polite">
              <p className="text-overline uppercase text-fg-tertiary">
                {t('codes.newCodeFor', { role: ROLE_LABELS[latest.role] })}
                {latest.entityId && ` \u00b7 ${t('codes.boundTo', { entity: entityLabel(latest.entityId) })}`}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <code className="select-all font-mono text-h2 tracking-[0.08em] text-fg">{latest.code}</code>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={copy}
                  leadingIcon={<i className={copied ? 'fas fa-check' : 'fas fa-copy'} aria-hidden="true" />}
                >
                  {copied ? t('codes.copied') : t('codes.copy')}
                </Button>
              </div>
              <p className="mt-3 text-caption text-fg-tertiary">
                Share this code only with the person you are inviting. It works once.
              </p>
            </div>
          </Card>
        )}
      </Card>

      <div>
        <h2 className="mb-3 text-h3 text-fg">Issued codes</h2>
        <Table caption="Access codes that have been issued">
          <THead>
            <TR>
              <TH>Code</TH>
              <TH>Role</TH>
              <TH>Status</TH>
              <TH className="hidden sm:table-cell">Generated by</TH>
            </TR>
          </THead>
          <TBody>
            {accessCodes.length === 0 ? (
              <TableEmpty colSpan={4}>No codes have been generated yet.</TableEmpty>
            ) : (
              accessCodes.map((ac, idx) => (
                <TR key={ac.code || idx}>
                  <TD className="font-mono tracking-wider text-fg">{ac.code}</TD>
                  <TD>{ROLE_LABELS[ac.role] || ac.role}</TD>
                  <TD>
                    <Badge tone={ac.isUsed ? 'stalled' : 'progress'} size="sm">
                      {ac.isUsed ? 'Used' : 'Active'}
                    </Badge>
                  </TD>
                  <TD className="hidden sm:table-cell">{ac.generatedBy}</TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </div>
    </div>
  );
};
