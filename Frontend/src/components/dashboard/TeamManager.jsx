import React from 'react';
import { Card, Button, Input, Textarea, EmptyState } from '../ui';
import { useT } from '../../i18n';

/**
 * Team management. Same form contract: hidden id field, name, role and bio read from
 * FormData by the parent.
 */
export const TeamManager = ({ members, editingMember, onEditClick, onCancelEdit, onSave }) => {
  const t = useT();
  if (!members || members.length === 0) {
    return <EmptyState icon="fa-users" title={t('admin.noTeamMembers')} />;
  }

  return (
    <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {members.map((m) => (
        <li key={m.id}>
          <Card padding="lg" className="h-full">
            {editingMember?.id === m.id ? (
              <form onSubmit={onSave} className="flex flex-col gap-4">
                <input type="hidden" name="id" value={m.id} />
                <Input name="name" label={t('admin.name')} defaultValue={m.name} required />
                <Input name="role" label={t('admin.role')} defaultValue={m.role} required />
                <Textarea name="bio" label={t('admin.bio')} defaultValue={m.bio} rows={3} />
                <div className="flex gap-2">
                  <Button type="submit" variant="primary" size="sm">
                    {t('common.save')}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={onCancelEdit}>
                    {t('common.cancel')}
                  </Button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <img
                    src={m.imageUrl}
                    alt=""
                    width="48"
                    height="48"
                    loading="lazy"
                    className="h-12 w-12 shrink-0 rounded-full border border-line object-cover"
                  />
                  <div className="min-w-0">
                    <h3 className="text-h3 text-fg">{m.name}</h3>
                    <p className="text-caption text-accent">{m.role}</p>
                  </div>
                </div>
                <p className="mt-4 min-h-[40px] text-body text-fg-secondary">{m.bio}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-4"
                  onClick={() => onEditClick(m)}
                  leadingIcon={<i className="fas fa-pen" aria-hidden="true" />}
                >
                  {t('admin.editInformation')}
                </Button>
              </>
            )}
          </Card>
        </li>
      ))}
    </ul>
  );
};
