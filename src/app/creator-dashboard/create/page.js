// app/creator-dashboard/create/page.tsx  (SERVER component)
export const runtime = 'nodejs';

import { AddBlog } from '@/action/blogAction';
import CreateBlogClient from '@/components/pseudo-pages/CreateBlogClient';

export default function Page() {
  const initialData = {
    title: '',
    description: '',
    content: '',
    tags: '',
    isPremium: false,
    image: null
  };
  return <CreateBlogClient AddBlog={AddBlog} initialData={initialData} />;
}
