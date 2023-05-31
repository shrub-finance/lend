
import NavElement from './nav-element';
interface Props {
  children: React.ReactNode;
}

export const MobileMenu: React.FC<Props> = ({ children }) => {

  return (
    <div className="flex-1 drawer h-52">
      <input id="my-drawer" type="checkbox" className="grow drawer-toggle" />
      <div className="items-center  drawer-content">
        {children}
      </div>
      {/* SideBar / Drawer */}
      <div className="drawer-side">
        <label htmlFor="my-drawer" className="drawer-overlay gap-6"></label>

        <ul className="p-4 overflow-y-auto w-80 bg-shrub-blue gap-10 sm:flex flex-col items-center gap-4">
          <li>
          <NavElement
            label="Home"
            href="/"
          />
          </li>
          <li >
            <NavElement
              label="Dashboard"
              href="/dashboard"
            />
          </li>
          <li>
          <NavElement
            label="Lend"
            href="/lend"
          />
          </li>
          <li>
            <NavElement
              label="Borrow"
              href="/borrow"
            />
          </li>
        </ul>
      </div>
    </div>
  );
};
