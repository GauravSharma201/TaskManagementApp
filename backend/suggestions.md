## for fetching the data initially, just after the user log's in, we could use eager loading.

✅ Rule of thumb:

include + where → filters child records, may exclude parent rows.

include + where + required: false → filters child records but keeps parent rows.

```typescript

const workspaces = await Workspace.findAll({
  include: [
    {
      model: WorkspaceMember,
      where: { user_id: userId },
      attributes: [], // exclude join table fields
    },
    {
      model: Project,
      include: [
        {
          model: ProjectMember,
          where: { user_id: userId },
          attributes: [],
        },
        {
          model: Task,
          include: [
            {
              model: User,
              as: 'assignee',
              attributes: ['id', 'name', 'email'],
            },
            {
              model: User,
              as: 'assigner',
              attributes: ['id', 'name', 'email'],
            },
          ],
        },
      ],
    },
  ],
});

```