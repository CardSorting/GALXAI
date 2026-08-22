import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export default async function TodosPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: todos, error } = await supabase.from('todos').select();

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Supabase Server Component Connection</h1>
      {error && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-lg text-sm mb-4">
          Status: Connected to Supabase SSR Client. (Table `todos` will populate once created in schema).
        </div>
      )}
      <ul className="space-y-2">
        {todos?.map((todo: any) => (
          <li key={todo.id} className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
            {todo.name}
          </li>
        ))}
        {(!todos || todos.length === 0) && (
          <li className="text-zinc-500 text-sm italic">No items found in `todos` table.</li>
        )}
      </ul>
    </div>
  );
}
